import { and, desc, eq, inArray, isNotNull, lte, or, sql } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  fellowships,
  branches,
  branchDepartments,
  departments,
  members,
  consentRecords,
  fellowshipMembers,
  departmentMembers,
  serviceAttendance,
  services,
  fellowshipMeetings,
  fellowshipMeetingAttendance,
  newBelieverEnrollments,
  formSubmissions,
  notificationPreferences,
  fellowshipJoinRequests,
  departmentJoinRequests,
  fellowshipFollowups,
  departmentFollowups,
  mentorFollowups,
  souls,
} from '@kairos/database';
import type {
  AuthContext,
  MeActivityItem,
  MeApprovalItem,
  MeFollowupItem,
  MeLeadershipResponse,
} from '@kairos/types';
import { verifyPassword, UnauthorizedError, NotFoundError } from '@kairos/utils';
import { randomTokenHex } from '@kairos/utils';
import { authHasCapability } from '../lib/grants';

/**
 * Build the caller's leadership footprint:
 *   - branch-admin authority arrays (echoed from AuthContext)
 *   - fellowships where the caller is the leader / co-leader
 *   - branch-departments where the caller is the lead / deputy
 *
 * The fellowships + departments queries are restricted to active rows so the
 * caller doesn't see entities they used to lead.
 *
 * ── Scope-aware filtering (Phase 4) ───────────────────────────────────
 *
 * When `auth.scope` is set, the user has picked a single role/entity at
 * /select-role and is acting through it. We narrow the response so the
 * dashboard + reports surfaces (which read this endpoint as their source of
 * truth) only see the chosen entity:
 *
 *   - scope=fellowship:F  → leadFellowships/coLeadFellowships filtered to F;
 *                          departments + branch-admin arrays emptied.
 *   - scope=department:D  → mirror: only D in leadDepartments/deputyDepartments,
 *                          others emptied.
 *   - scope=branch:B      → branchSystemAdminBranchIds/branchDataAdminBranchIds
 *                          filtered to just B (kept only if the user actually
 *                          holds it); fellowship/department arrays emptied.
 *   - scope=undefined     → unfiltered, legacy behavior.
 */
export async function getMyLeadership(
  db: Database,
  auth: AuthContext,
): Promise<MeLeadershipResponse> {
  const memberId = auth.memberId;

  const [fellowshipRows, departmentRows] = await Promise.all([
    db
      .select({
        id: fellowships.id,
        fellowshipName: fellowships.fellowshipName,
        branchId: fellowships.branchId,
        leaderId: fellowships.leaderId,
        coLeaderId: fellowships.coLeaderId,
      })
      .from(fellowships)
      .where(
        and(
          eq(fellowships.isActive, true),
          or(eq(fellowships.leaderId, memberId), eq(fellowships.coLeaderId, memberId)),
        ),
      ),
    db
      .select({
        id: branchDepartments.id,
        departmentName: departments.departmentName,
        branchId: branchDepartments.branchId,
        leadMemberId: branchDepartments.leadMemberId,
        deputyMemberId: branchDepartments.deputyMemberId,
      })
      .from(branchDepartments)
      .innerJoin(departments, eq(branchDepartments.departmentId, departments.id))
      .where(
        and(
          eq(branchDepartments.isActive, true),
          or(
            eq(branchDepartments.leadMemberId, memberId),
            eq(branchDepartments.deputyMemberId, memberId),
          ),
        ),
      ),
  ]);

  const leadFellowships = fellowshipRows
    .filter((r) => r.leaderId === memberId)
    .map((r) => ({ id: r.id, fellowshipName: r.fellowshipName, branchId: r.branchId }));
  const coLeadFellowships = fellowshipRows
    .filter((r) => r.coLeaderId === memberId)
    .map((r) => ({ id: r.id, fellowshipName: r.fellowshipName, branchId: r.branchId }));

  const leadDepartments = departmentRows
    .filter((r) => r.leadMemberId === memberId)
    .map((r) => ({ id: r.id, departmentName: r.departmentName, branchId: r.branchId }));
  const deputyDepartments = departmentRows
    .filter((r) => r.deputyMemberId === memberId)
    .map((r) => ({ id: r.id, departmentName: r.departmentName, branchId: r.branchId }));

  const { branchSystemAdminBranchIds, branchDataAdminBranchIds } = auth;

  // ── Scope-aware narrowing ────────────────────────────────────────────
  const scope = auth.scope;
  if (scope?.kind === 'fellowship') {
    return {
      branchSystemAdminBranchIds: [],
      branchDataAdminBranchIds: [],
      leadFellowships: leadFellowships.filter((f) => f.id === scope.id),
      coLeadFellowships: coLeadFellowships.filter((f) => f.id === scope.id),
      leadDepartments: [],
      deputyDepartments: [],
    };
  }
  if (scope?.kind === 'department') {
    return {
      branchSystemAdminBranchIds: [],
      branchDataAdminBranchIds: [],
      leadFellowships: [],
      coLeadFellowships: [],
      leadDepartments: leadDepartments.filter((d) => d.id === scope.id),
      deputyDepartments: deputyDepartments.filter((d) => d.id === scope.id),
    };
  }
  if (scope?.kind === 'branch') {
    return {
      branchSystemAdminBranchIds: branchSystemAdminBranchIds.filter((b) => b === scope.id),
      branchDataAdminBranchIds: branchDataAdminBranchIds.filter((b) => b === scope.id),
      leadFellowships: [],
      coLeadFellowships: [],
      leadDepartments: [],
      deputyDepartments: [],
    };
  }

  return {
    branchSystemAdminBranchIds,
    branchDataAdminBranchIds,
    leadFellowships,
    coLeadFellowships,
    leadDepartments,
    deputyDepartments,
  };
}

/**
 * Does the caller hold any role that surfaces PII of other members? Used to
 * decide whether the confidentiality-undertaking gate applies. Returns true
 * when the caller:
 *   - is a system admin (`systemRole = 'admin'`), OR
 *   - holds a BranchAdmin or BranchDataAdmin grant on any branch, OR
 *   - is the active leader / co-leader of any fellowship, OR
 *   - is the active lead / deputy of any branch_department.
 *
 * The fellowship / department checks hit the DB because that leadership is
 * not currently encoded in the JWT. Kept cheap by selecting only the id.
 */
export async function hasPrivilegedRole(
  db: Database,
  auth: AuthContext,
): Promise<boolean> {
  if (auth.systemRole === 'admin') return true;
  if (auth.branchSystemAdminBranchIds.length > 0) return true;
  if (auth.branchDataAdminBranchIds.length > 0) return true;

  const memberId = auth.memberId;
  const [fellowshipRows, departmentRows] = await Promise.all([
    db
      .select({ id: fellowships.id })
      .from(fellowships)
      .where(
        and(
          eq(fellowships.isActive, true),
          or(eq(fellowships.leaderId, memberId), eq(fellowships.coLeaderId, memberId)),
        ),
      )
      .limit(1),
    db
      .select({ id: branchDepartments.id })
      .from(branchDepartments)
      .where(
        and(
          eq(branchDepartments.isActive, true),
          or(
            eq(branchDepartments.leadMemberId, memberId),
            eq(branchDepartments.deputyMemberId, memberId),
          ),
        ),
      )
      .limit(1),
  ]);

  return fellowshipRows.length > 0 || departmentRows.length > 0;
}

/**
 * GDPR right to erasure — user-initiated account deletion.
 *
 * Rather than a hard delete (which would cascade-remove attendance history and
 * safeguarding audit trail we may need to keep), we scrub direct PII on the
 * member row and flip isActive=false. Related tables that reference this
 * memberId (attendance, form submissions, consent audit) are kept, but now
 * point at an anonymised shell.
 *
 * The requester must supply their current password. On success:
 *   - Their email, phone, address, DOB, photo etc. are cleared / replaced
 *   - Password hash is scrambled so no future login attempt succeeds
 *   - isActive=false — refresh-token path already filters on isActive so
 *     existing sessions can't be extended past the 15-minute access-token TTL
 *
 * Consent records remain (kept for the audit lifetime documented in the
 * privacy notice). Notification preferences are deleted since they're
 * behavioural state, not audit.
 */
export async function deleteMyAccount(
  db: Database,
  memberId: string,
  currentPassword: string,
): Promise<void> {
  const [member] = await db
    .select({
      id: members.id,
      passwordHash: members.passwordHash,
      isActive: members.isActive,
    })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);

  if (!member) {
    throw new NotFoundError('Member');
  }
  if (!member.isActive) {
    throw new UnauthorizedError('This account is already deactivated');
  }

  const valid = await verifyPassword(currentPassword, member.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Password is incorrect');
  }

  // Scrub PII. Email must stay unique + not-null; replace with a per-id
  // placeholder that no real user will ever produce.
  const now = new Date();
  const anonEmail = `deleted-${memberId}@deleted.kairos.local`;
  const unusablePasswordHash = `!DELETED!${randomTokenHex(24)}`;

  await db
    .update(members)
    .set({
      firstName: 'Deleted',
      lastName: 'User',
      middleName: null,
      dateOfBirth: null,
      gender: null,
      email: anonEmail,
      phone: null,
      address: null,
      city: null,
      postalCode: null,
      secondaryAddress: null,
      secondaryCity: null,
      secondaryPostalCode: null,
      photoUrl: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      emergencyContactRelationship: null,
      honorific: null,
      passwordHash: unusablePasswordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
      emailVerified: false,
      isActive: false,
      approvalStatus: 'rejected',
      updatedAt: now,
    })
    .where(eq(members.id, memberId));

  // Wipe notification preferences — they're per-member behavioural state, not
  // audit. Keeping them serves no one.
  await db.delete(notificationPreferences).where(eq(notificationPreferences.memberId, memberId));
}

/**
 * GDPR data portability — return a machine-readable dump of the requester's
 * data. Covers the biggest first-party surfaces:
 *   - their member row
 *   - consent history
 *   - fellowship + department memberships
 *   - attendance (service + fellowship meetings)
 *   - new-believer pipeline enrolment
 *   - form submissions where they are the subject
 *   - notification preferences
 *
 * Anything beyond this (audit log, follow-ups written by leaders about them,
 * safeguarding notes, outreach participation) is available on request per the
 * privacy notice; keeping the automated export focused avoids leaking third-
 * party data (e.g. mentor session notes) that isn't strictly the requester's
 * own contribution.
 */
export async function exportMyData(db: Database, memberId: string) {
  // Row-level lookups are joined so each returned row carries the human-readable
  // name (fellowship name, department name, branch name, meeting date) alongside
  // its ID. Keeps IDs in the payload so the JSON export stays machine-readable
  // (GDPR Art. 20) while giving the HTML renderer something a person can read.
  const [
    memberRow,
    consents,
    fellowshipMembershipsEnriched,
    deptMembershipsEnriched,
    serviceAttendanceEnriched,
    fellowshipAttendanceEnriched,
    nbEnrollmentsEnriched,
    formSubmissionRows,
    prefs,
  ] = await Promise.all([
    db.select().from(members).where(eq(members.id, memberId)).limit(1),
    db.select().from(consentRecords).where(eq(consentRecords.memberId, memberId)),

    db
      .select({
        fellowshipId: fellowshipMembers.fellowshipId,
        fellowshipName: fellowships.fellowshipName,
        fellowshipType: fellowships.fellowshipType,
        branchId: fellowships.branchId,
        branchName: branches.branchName,
        joinDate: fellowshipMembers.joinDate,
        leaveDate: fellowshipMembers.leaveDate,
        isActive: fellowshipMembers.isActive,
        notes: fellowshipMembers.notes,
      })
      .from(fellowshipMembers)
      .innerJoin(fellowships, eq(fellowshipMembers.fellowshipId, fellowships.id))
      .leftJoin(branches, eq(fellowships.branchId, branches.id))
      .where(eq(fellowshipMembers.memberId, memberId)),

    db
      .select({
        branchDepartmentId: departmentMembers.branchDepartmentId,
        departmentName: departments.departmentName,
        branchId: branchDepartments.branchId,
        branchName: branches.branchName,
        joinDate: departmentMembers.joinDate,
        leaveDate: departmentMembers.leaveDate,
        isActive: departmentMembers.isActive,
        membershipStatus: departmentMembers.membershipStatus,
      })
      .from(departmentMembers)
      .innerJoin(branchDepartments, eq(departmentMembers.branchDepartmentId, branchDepartments.id))
      .innerJoin(departments, eq(branchDepartments.departmentId, departments.id))
      .leftJoin(branches, eq(branchDepartments.branchId, branches.id))
      .where(eq(departmentMembers.memberId, memberId)),

    db
      .select({
        serviceId: serviceAttendance.serviceId,
        serviceDate: services.serviceDate,
        serviceType: services.serviceType,
        serviceTitle: services.serviceTitle,
        branchName: branches.branchName,
        attendanceStatus: serviceAttendance.attendanceStatus,
        arrivalTime: serviceAttendance.arrivalTime,
        isFirstTimeVisitor: serviceAttendance.isFirstTimeVisitor,
        recordedAt: serviceAttendance.recordedAt,
      })
      .from(serviceAttendance)
      .innerJoin(services, eq(serviceAttendance.serviceId, services.id))
      .leftJoin(branches, eq(services.branchId, branches.id))
      .where(eq(serviceAttendance.memberId, memberId)),

    db
      .select({
        meetingId: fellowshipMeetingAttendance.meetingId,
        meetingDate: fellowshipMeetings.meetingDate,
        meetingTitle: fellowshipMeetings.meetingTitle,
        meetingTopic: fellowshipMeetings.meetingTopic,
        fellowshipId: fellowshipMeetings.fellowshipId,
        fellowshipName: fellowships.fellowshipName,
        attendanceStatus: fellowshipMeetingAttendance.attendanceStatus,
        arrivalTime: fellowshipMeetingAttendance.arrivalTime,
        recordedAt: fellowshipMeetingAttendance.recordedAt,
      })
      .from(fellowshipMeetingAttendance)
      .innerJoin(fellowshipMeetings, eq(fellowshipMeetingAttendance.meetingId, fellowshipMeetings.id))
      .leftJoin(fellowships, eq(fellowshipMeetings.fellowshipId, fellowships.id))
      .where(eq(fellowshipMeetingAttendance.memberId, memberId)),

    db
      .select({
        id: newBelieverEnrollments.id,
        branchId: newBelieverEnrollments.branchId,
        branchName: branches.branchName,
        stage: newBelieverEnrollments.stage,
        enrolledAt: newBelieverEnrollments.enrolledAt,
        completedAt: newBelieverEnrollments.completedAt,
        isActive: newBelieverEnrollments.isActive,
      })
      .from(newBelieverEnrollments)
      .leftJoin(branches, eq(newBelieverEnrollments.branchId, branches.id))
      .where(eq(newBelieverEnrollments.memberId, memberId)),

    db.select().from(formSubmissions).where(eq(formSubmissions.subjectMemberId, memberId)),
    db.select().from(notificationPreferences).where(eq(notificationPreferences.memberId, memberId)),
  ]);

  if (memberRow.length === 0) {
    throw new NotFoundError('Member');
  }

  // Strip the password hash from the exported member row — an attacker
  // shouldn't be able to grab it via this endpoint even for their own account.
  const { passwordHash: _drop, passwordResetToken: _drop2, ...safeMember } = memberRow[0]!;
  void _drop; void _drop2;

  // Enrich home + secondary branch on the member row so the profile section
  // shows names, not UUIDs.
  const branchIds = [safeMember.homeBranchId, safeMember.secondaryBranchId]
    .filter((v): v is string => typeof v === 'string' && v.length > 0);
  const branchLookup = branchIds.length
    ? await db
        .select({ id: branches.id, branchName: branches.branchName, city: branches.city })
        .from(branches)
        .where(inArray(branches.id, branchIds))
    : [];
  const branchById = new Map(branchLookup.map((b) => [b.id, b]));

  const memberOut = {
    ...safeMember,
    homeBranchName: safeMember.homeBranchId ? branchById.get(safeMember.homeBranchId)?.branchName ?? null : null,
    secondaryBranchName: safeMember.secondaryBranchId
      ? branchById.get(safeMember.secondaryBranchId)?.branchName ?? null
      : null,
  };

  return {
    exportedAt: new Date().toISOString(),
    member: memberOut,
    consents,
    fellowshipMemberships: fellowshipMembershipsEnriched,
    departmentMemberships: deptMembershipsEnriched,
    serviceAttendance: serviceAttendanceEnriched,
    fellowshipMeetingAttendance: fellowshipAttendanceEnriched,
    newBelieverEnrollments: nbEnrollmentsEnriched,
    formSubmissionsAboutMe: formSubmissionRows,
    notificationPreferences: prefs,
  };
}

// ── Unified inbox — approvals + follow-ups ────────────────
//
// Both feeds walk the caller's scope grants and roll cross-domain rows into a
// single list. Non-admin scoping is intentionally narrow: the caller sees the
// fellowships / departments they lead, not everything in the branch. Admin
// (systemRole='admin' OR BranchAdmin grant on this branch) sees everything
// in `auth.branchId`.

async function fellowshipIdsCallerCanApprove(
  db: Database,
  auth: AuthContext,
): Promise<string[]> {
  const branchWide = authHasCapability(auth, 'branch:write', {
    kind: 'branch',
    id: auth.branchId,
  });
  const conditions = [eq(fellowships.branchId, auth.branchId), eq(fellowships.isActive, true)];
  if (!branchWide) {
    const leaderFellowshipIds = (auth.grants ?? [])
      .filter((g) => g.scope.kind === 'fellowship')
      .map((g) => g.scope.id);
    if (leaderFellowshipIds.length === 0) return [];
    conditions.push(inArray(fellowships.id, leaderFellowshipIds));
  }
  const rows = await db
    .select({ id: fellowships.id })
    .from(fellowships)
    .where(and(...conditions));
  return rows.map((r) => r.id);
}

async function branchDeptIdsCallerCanApprove(
  db: Database,
  auth: AuthContext,
): Promise<string[]> {
  const branchWide = authHasCapability(auth, 'branch:write', {
    kind: 'branch',
    id: auth.branchId,
  });
  const conditions = [
    eq(branchDepartments.branchId, auth.branchId),
    eq(branchDepartments.isActive, true),
  ];
  if (!branchWide) {
    const leaderDeptIds = (auth.grants ?? [])
      .filter((g) => g.scope.kind === 'department')
      .map((g) => g.scope.id);
    if (leaderDeptIds.length === 0) return [];
    conditions.push(inArray(branchDepartments.id, leaderDeptIds));
  }
  const rows = await db
    .select({ id: branchDepartments.id })
    .from(branchDepartments)
    .where(and(...conditions));
  return rows.map((r) => r.id);
}

export async function listMyApprovals(
  db: Database,
  auth: AuthContext,
): Promise<MeApprovalItem[]> {
  const items: MeApprovalItem[] = [];
  const branchWide = authHasCapability(auth, 'branch:write', {
    kind: 'branch',
    id: auth.branchId,
  });

  // 1) Member signups — branch-scoped, only branch admins see them.
  if (branchWide) {
    const signupRows = await db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        createdAt: members.createdAt,
        branchName: branches.branchName,
      })
      .from(members)
      .leftJoin(branches, eq(members.homeBranchId, branches.id))
      .where(
        and(
          eq(members.homeBranchId, auth.branchId),
          eq(members.approvalStatus, 'pending'),
          eq(members.isActive, true),
        ),
      )
      .orderBy(desc(members.createdAt));
    for (const r of signupRows) {
      items.push({
        kind: 'member_signup',
        id: r.id,
        subjectMemberId: r.id,
        subjectName: `${r.firstName} ${r.lastName}`,
        branchName: r.branchName ?? null,
        createdAt: (r.createdAt as Date).toISOString(),
      });
    }
  }

  // 2) Fellowship join requests — for fellowships the caller can approve.
  const fellowshipIds = await fellowshipIdsCallerCanApprove(db, auth);
  if (fellowshipIds.length > 0) {
    const fjrRows = await db
      .select({
        id: fellowshipJoinRequests.id,
        memberId: fellowshipJoinRequests.memberId,
        firstName: members.firstName,
        lastName: members.lastName,
        fellowshipId: fellowshipJoinRequests.fellowshipId,
        fellowshipName: fellowships.fellowshipName,
        createdAt: fellowshipJoinRequests.createdAt,
      })
      .from(fellowshipJoinRequests)
      .innerJoin(members, eq(fellowshipJoinRequests.memberId, members.id))
      .innerJoin(fellowships, eq(fellowshipJoinRequests.fellowshipId, fellowships.id))
      .where(
        and(
          inArray(fellowshipJoinRequests.fellowshipId, fellowshipIds),
          eq(fellowshipJoinRequests.status, 'pending'),
        ),
      )
      .orderBy(desc(fellowshipJoinRequests.createdAt));
    for (const r of fjrRows) {
      items.push({
        kind: 'fellowship_join',
        id: r.id,
        subjectMemberId: r.memberId,
        subjectName: `${r.firstName} ${r.lastName}`,
        fellowshipId: r.fellowshipId,
        fellowshipName: r.fellowshipName,
        createdAt: (r.createdAt as Date).toISOString(),
      });
    }
  }

  // 3) Department join requests — anything in an open state.
  const branchDeptIds = await branchDeptIdsCallerCanApprove(db, auth);
  if (branchDeptIds.length > 0) {
    const openStatuses = [
      'applied',
      'interview_scheduled',
      'interviewed',
      'offered',
      'probation',
    ];
    const djrRows = await db
      .select({
        id: departmentJoinRequests.id,
        memberId: departmentJoinRequests.memberId,
        firstName: members.firstName,
        lastName: members.lastName,
        branchDeptId: departmentJoinRequests.branchDepartmentId,
        departmentName: departments.departmentName,
        status: departmentJoinRequests.status,
        createdAt: departmentJoinRequests.createdAt,
      })
      .from(departmentJoinRequests)
      .innerJoin(members, eq(departmentJoinRequests.memberId, members.id))
      .innerJoin(
        branchDepartments,
        eq(departmentJoinRequests.branchDepartmentId, branchDepartments.id),
      )
      .innerJoin(departments, eq(branchDepartments.departmentId, departments.id))
      .where(
        and(
          inArray(departmentJoinRequests.branchDepartmentId, branchDeptIds),
          inArray(departmentJoinRequests.status, openStatuses),
        ),
      )
      .orderBy(desc(departmentJoinRequests.createdAt));
    for (const r of djrRows) {
      items.push({
        kind: 'department_join',
        id: r.id,
        subjectMemberId: r.memberId,
        subjectName: `${r.firstName} ${r.lastName}`,
        branchDeptId: r.branchDeptId,
        departmentName: r.departmentName,
        status: r.status,
        createdAt: (r.createdAt as Date).toISOString(),
      });
    }
  }

  // Newest first across the whole feed — the client can filter by kind.
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return items;
}

export async function listMyFollowups(
  db: Database,
  auth: AuthContext,
): Promise<MeFollowupItem[]> {
  const items: MeFollowupItem[] = [];
  const today = new Date().toISOString().slice(0, 10);

  // 1) Souls — assigned to me and in a non-terminal state. Kept personal-scope
  // (assignee, not branch-wide) so the caller sees their own workload.
  const soulRows = await db
    .select({
      id: souls.id,
      firstName: souls.firstName,
      lastName: souls.lastName,
      status: souls.status,
      createdAt: souls.createdAt,
    })
    .from(souls)
    .where(
      and(
        eq(souls.assignedMemberId, auth.memberId),
        inArray(souls.status, ['Following Up', 'Interested']),
      ),
    )
    .orderBy(desc(souls.createdAt));
  for (const r of soulRows) {
    items.push({
      kind: 'soul',
      id: r.id,
      subjectName: `${r.firstName} ${r.lastName}`,
      status: r.status,
      createdAt: (r.createdAt as Date).toISOString(),
    });
  }

  // 2) Fellowship followups — any row with a nextFollowUpDate that has come
  // due, for fellowships the caller can approve/manage.
  const fellowshipIds = await fellowshipIdsCallerCanApprove(db, auth);
  if (fellowshipIds.length > 0) {
    const ffRows = await db
      .select({
        id: fellowshipFollowups.id,
        memberId: fellowshipFollowups.memberId,
        firstName: members.firstName,
        lastName: members.lastName,
        fellowshipId: fellowshipFollowups.fellowshipId,
        fellowshipName: fellowships.fellowshipName,
        nextFollowUpDate: fellowshipFollowups.nextFollowUpDate,
        notes: fellowshipFollowups.notes,
      })
      .from(fellowshipFollowups)
      .innerJoin(members, eq(fellowshipFollowups.memberId, members.id))
      .innerJoin(fellowships, eq(fellowshipFollowups.fellowshipId, fellowships.id))
      .where(
        and(
          inArray(fellowshipFollowups.fellowshipId, fellowshipIds),
          isNotNull(fellowshipFollowups.nextFollowUpDate),
          lte(fellowshipFollowups.nextFollowUpDate, today),
        ),
      )
      .orderBy(fellowshipFollowups.nextFollowUpDate);
    for (const r of ffRows) {
      items.push({
        kind: 'fellowship_followup',
        id: r.id,
        memberId: r.memberId,
        subjectName: `${r.firstName} ${r.lastName}`,
        fellowshipId: r.fellowshipId,
        fellowshipName: r.fellowshipName,
        nextFollowUpDate: r.nextFollowUpDate as string,
        notes: r.notes,
      });
    }
  }

  // 3) Department followups — same pattern.
  const branchDeptIds = await branchDeptIdsCallerCanApprove(db, auth);
  if (branchDeptIds.length > 0) {
    const dfRows = await db
      .select({
        id: departmentFollowups.id,
        memberId: departmentFollowups.memberId,
        firstName: members.firstName,
        lastName: members.lastName,
        branchDeptId: departmentFollowups.branchDepartmentId,
        departmentName: departments.departmentName,
        nextFollowUpDate: departmentFollowups.nextFollowUpDate,
        notes: departmentFollowups.notes,
      })
      .from(departmentFollowups)
      .innerJoin(members, eq(departmentFollowups.memberId, members.id))
      .innerJoin(
        branchDepartments,
        eq(departmentFollowups.branchDepartmentId, branchDepartments.id),
      )
      .innerJoin(departments, eq(branchDepartments.departmentId, departments.id))
      .where(
        and(
          inArray(departmentFollowups.branchDepartmentId, branchDeptIds),
          isNotNull(departmentFollowups.nextFollowUpDate),
          lte(departmentFollowups.nextFollowUpDate, today),
        ),
      )
      .orderBy(departmentFollowups.nextFollowUpDate);
    for (const r of dfRows) {
      items.push({
        kind: 'department_followup',
        id: r.id,
        memberId: r.memberId,
        subjectName: `${r.firstName} ${r.lastName}`,
        branchDeptId: r.branchDeptId,
        departmentName: r.departmentName,
        nextFollowUpDate: r.nextFollowUpDate as string,
        notes: r.notes,
      });
    }
  }

  // 4) Mentor followups — surface one row per active enrollment where the
  // caller is EITHER the assigned mentor OR has personally logged at least
  // one mentor followup (e.g. a co-mentor / NB-leader filling in for the
  // primary). Prevents the "I recorded a followup but it doesn't show in
  // my inbox" gap when a non-primary-mentor helped out.
  const mentorEnrollments = await db
    .select({
      id: newBelieverEnrollments.id,
      memberId: newBelieverEnrollments.memberId,
      firstName: members.firstName,
      lastName: members.lastName,
      lastContactedAt: sql<Date | null>`max(${mentorFollowups.contactedAt})`,
    })
    .from(newBelieverEnrollments)
    .innerJoin(members, eq(newBelieverEnrollments.memberId, members.id))
    .leftJoin(
      mentorFollowups,
      and(
        eq(mentorFollowups.enrollmentId, newBelieverEnrollments.id),
        eq(mentorFollowups.isActive, true),
      )!,
    )
    .where(
      and(
        eq(newBelieverEnrollments.isActive, true),
        or(
          eq(newBelieverEnrollments.mentorId, auth.memberId),
          eq(mentorFollowups.createdBy, auth.memberId),
        ),
      ),
    )
    .groupBy(
      newBelieverEnrollments.id,
      newBelieverEnrollments.memberId,
      members.firstName,
      members.lastName,
    );
  for (const r of mentorEnrollments) {
    items.push({
      kind: 'mentor_enrollment',
      id: r.id,
      memberId: r.memberId,
      subjectName: `${r.firstName} ${r.lastName}`,
      lastContactedAt: r.lastContactedAt ? r.lastContactedAt.toISOString() : null,
    });
  }

  return items;
}

/**
 * The log side of /follow-ups — every touchpoint the caller has personally
 * recorded, most-recent first. Union of soul captures + fellowship + dept +
 * NB mentor followups authored by the caller. Distinct rows per followup
 * (unlike listMyFollowups which collapses mentors to one row per enrollment).
 */
export async function listMyActivity(
  db: Database,
  auth: AuthContext,
): Promise<MeActivityItem[]> {
  const items: MeActivityItem[] = [];

  // 1) Souls assigned to me — the schema has `assignedMemberId` (who's
  // following up) but no `capturedBy`, so we use the assignee as a proxy for
  // "souls I'm working". Follow-up ticket: add capturedBy to souls schema.
  const soulRows = await db
    .select({
      id: souls.id,
      firstName: souls.firstName,
      lastName: souls.lastName,
      status: souls.status,
      createdAt: souls.createdAt,
    })
    .from(souls)
    .where(eq(souls.assignedMemberId, auth.memberId))
    .orderBy(desc(souls.createdAt))
    .limit(50);
  for (const r of soulRows) {
    items.push({
      kind: 'soul_capture',
      id: r.id,
      subjectName: `${r.firstName} ${r.lastName}`,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    });
  }

  // 2) Fellowship followups I recorded.
  const fellowshipRows = await db
    .select({
      id: fellowshipFollowups.id,
      memberId: fellowshipFollowups.memberId,
      firstName: members.firstName,
      lastName: members.lastName,
      fellowshipId: fellowshipFollowups.fellowshipId,
      fellowshipName: fellowships.fellowshipName,
      contactedAt: fellowshipFollowups.contactedAt,
      notes: fellowshipFollowups.notes,
    })
    .from(fellowshipFollowups)
    .innerJoin(members, eq(fellowshipFollowups.memberId, members.id))
    .innerJoin(fellowships, eq(fellowshipFollowups.fellowshipId, fellowships.id))
    .where(eq(fellowshipFollowups.recordedById, auth.memberId))
    .orderBy(desc(fellowshipFollowups.contactedAt))
    .limit(50);
  for (const r of fellowshipRows) {
    items.push({
      kind: 'fellowship_followup',
      id: r.id,
      memberId: r.memberId,
      subjectName: `${r.firstName} ${r.lastName}`,
      fellowshipId: r.fellowshipId,
      fellowshipName: r.fellowshipName,
      contactedAt: r.contactedAt.toISOString(),
      notes: r.notes,
    });
  }

  // 3) Department followups I recorded.
  const deptRows = await db
    .select({
      id: departmentFollowups.id,
      memberId: departmentFollowups.memberId,
      firstName: members.firstName,
      lastName: members.lastName,
      branchDeptId: departmentFollowups.branchDepartmentId,
      departmentName: departments.departmentName,
      contactedAt: departmentFollowups.contactedAt,
      notes: departmentFollowups.notes,
    })
    .from(departmentFollowups)
    .innerJoin(members, eq(departmentFollowups.memberId, members.id))
    .innerJoin(
      branchDepartments,
      eq(departmentFollowups.branchDepartmentId, branchDepartments.id),
    )
    .innerJoin(departments, eq(branchDepartments.departmentId, departments.id))
    .where(eq(departmentFollowups.recordedById, auth.memberId))
    .orderBy(desc(departmentFollowups.contactedAt))
    .limit(50);
  for (const r of deptRows) {
    items.push({
      kind: 'department_followup',
      id: r.id,
      memberId: r.memberId,
      subjectName: `${r.firstName} ${r.lastName}`,
      branchDeptId: r.branchDeptId,
      departmentName: r.departmentName,
      contactedAt: r.contactedAt.toISOString(),
      notes: r.notes,
    });
  }

  // 4) NB mentor followups I recorded (via createdBy — the actual author,
  // not the enrollment.mentorId which is the assigned mentor).
  const mentorRows = await db
    .select({
      id: mentorFollowups.id,
      enrollmentId: mentorFollowups.enrollmentId,
      memberId: newBelieverEnrollments.memberId,
      firstName: members.firstName,
      lastName: members.lastName,
      contactedAt: mentorFollowups.contactedAt,
      note: mentorFollowups.note,
    })
    .from(mentorFollowups)
    .innerJoin(
      newBelieverEnrollments,
      eq(mentorFollowups.enrollmentId, newBelieverEnrollments.id),
    )
    .innerJoin(members, eq(newBelieverEnrollments.memberId, members.id))
    .where(
      and(
        eq(mentorFollowups.createdBy, auth.memberId),
        eq(mentorFollowups.isActive, true),
      ),
    )
    .orderBy(desc(mentorFollowups.contactedAt))
    .limit(50);
  for (const r of mentorRows) {
    items.push({
      kind: 'mentor_followup',
      id: r.id,
      enrollmentId: r.enrollmentId,
      memberId: r.memberId,
      subjectName: `${r.firstName} ${r.lastName}`,
      contactedAt: r.contactedAt.toISOString(),
      note: r.note,
    });
  }

  // Merge sort by timestamp, most recent first. Cap at 200 total items.
  const timeOf = (i: MeActivityItem): number => {
    if (i.kind === 'soul_capture') return new Date(i.createdAt).getTime();
    return new Date(i.contactedAt).getTime();
  };
  items.sort((a, b) => timeOf(b) - timeOf(a));
  return items.slice(0, 200);
}

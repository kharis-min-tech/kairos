import { and, eq, inArray, or } from 'drizzle-orm';
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
} from '@kairos/database';
import type { AuthContext, MeLeadershipResponse } from '@kairos/types';
import { verifyPassword, UnauthorizedError, NotFoundError } from '@kairos/utils';
import { randomTokenHex } from '@kairos/utils';

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

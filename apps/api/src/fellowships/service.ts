import { eq, and, or, count, sql, exists, gte } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { authHasCapability } from '../lib/grants';
import {
  fellowships,
  fellowshipMembers,
  fellowshipMeetings,
  fellowshipMeetingAttendance,
  fellowshipFollowups,
  fellowshipJoinRequests,
  members,
  branches,
  newBelieverEnrollments,
} from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  sendJoinRequestReceivedEmail,
  sendJoinRequestApprovedEmail,
  sendJoinRequestRejectedEmail,
} from '@kairos/utils';
import { enforceScopeAllows } from '../lib/scope';
import { syncFellowshipLeaderGrants } from '../lib/role-sync';
import { authHasAnyCapability } from '../lib/grants';
import { dispatchNotification } from '../notifications/service';
import {
  resolveBranchAuthority,
  resolveFellowshipLeaders,
} from '../notifications/recipients';
import { NotificationEventType } from '@kairos/types';

function joinRequestPortalUrl(fellowshipId: string): string {
  const base = process.env['FRONTEND_URL'] ?? 'http://localhost:3002';
  return `${base}/fellowships/${fellowshipId}`;
}

function enforceBranchScope(auth: AuthContext, branchId?: string) {
  if (authHasCapability(auth, 'branch:read')) return;
  if (branchId && branchId !== auth.branchId) {
    throw new ForbiddenError('You can only access fellowships in your branch');
  }
}

/**
 * Gate writes that require fellowship leadership. System admins and pastors
 * always pass. A `leader` whose memberId matches the fellowship lead or
 * co-lead passes, UNLESS the request carries a fellowship scope tied to a
 * different fellowship — in that case Phase 4's per-request narrowing
 * (`enforceScopeAllows`) rejects so a scope-bound leader can't act on a
 * fellowship outside their picked scope (even if they technically lead it).
 */
function enforceLeaderOrAbove(
  auth: AuthContext,
  fellowship: { id: string; leaderId: string | null; coLeaderId: string | null },
) {
  if (authHasCapability(auth, 'branch:read')) return;
  if (
    authHasAnyCapability(auth, 'fellowship:read', 'department:read') &&
    (fellowship.leaderId === auth.memberId || fellowship.coLeaderId === auth.memberId)
  ) {
    enforceScopeAllows(auth, 'fellowship', fellowship.id);
    return;
  }
  throw new ForbiddenError('Only fellowship leaders or above can perform this action');
}

// ── Fellowship CRUD ────────────────────────────────────────

export async function listFellowships(
  db: Database,
  auth: AuthContext,
  query: { page: number; limit: number; fellowshipType?: string; branchId?: string; memberId?: string },
) {
  const conditions = [eq(fellowships.isActive, true)];

  if (authHasCapability(auth, 'branch:read')) {
    if (query.branchId) {
      conditions.push(eq(fellowships.branchId, query.branchId));
    }
  } else if (authHasAnyCapability(auth, 'fellowship:read', 'department:read')) {
    // Leaders see only fellowships they lead or co-lead, scoped to their branch.
    conditions.push(eq(fellowships.branchId, auth.branchId));
    conditions.push(
      or(
        eq(fellowships.leaderId, auth.memberId),
        eq(fellowships.coLeaderId, auth.memberId),
      )!,
    );
  } else {
    conditions.push(eq(fellowships.branchId, auth.branchId));
  }

  if (query.fellowshipType) {
    conditions.push(eq(fellowships.fellowshipType, query.fellowshipType));
  }

  if (query.memberId) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(fellowshipMembers)
          .where(
            and(
              eq(fellowshipMembers.fellowshipId, fellowships.id),
              eq(fellowshipMembers.memberId, query.memberId),
              eq(fellowshipMembers.isActive, true),
            ),
          ),
      ),
    );
  }

  const where = and(...conditions);
  const offset = (query.page - 1) * query.limit;

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: fellowships.id,
        fellowshipName: fellowships.fellowshipName,
        branchId: fellowships.branchId,
        branchName: branches.branchName,
        fellowshipType: fellowships.fellowshipType,
        description: fellowships.description,
        leaderId: fellowships.leaderId,
        leaderFirstName: members.firstName,
        leaderLastName: members.lastName,
        coLeaderId: fellowships.coLeaderId,
        meetingSchedule: fellowships.meetingSchedule,
        isActive: fellowships.isActive,
        createdAt: fellowships.createdAt,
        updatedAt: fellowships.updatedAt,
      })
      .from(fellowships)
      .leftJoin(branches, eq(fellowships.branchId, branches.id))
      .leftJoin(members, eq(fellowships.leaderId, members.id))
      .where(where)
      .limit(query.limit)
      .offset(offset),
    db.select({ value: count() }).from(fellowships).where(where),
  ]);

  return {
    data: rows,
    meta: {
      page: query.page,
      limit: query.limit,
      total: total!.value,
      totalPages: Math.ceil(total!.value / query.limit),
    },
  };
}

export async function getFellowship(db: Database, auth: AuthContext, id: string) {
  const [fellowship] = await db
    .select({
      id: fellowships.id,
      fellowshipName: fellowships.fellowshipName,
      branchId: fellowships.branchId,
      branchName: branches.branchName,
      fellowshipType: fellowships.fellowshipType,
      description: fellowships.description,
      leaderId: fellowships.leaderId,
      coLeaderId: fellowships.coLeaderId,
      meetingSchedule: fellowships.meetingSchedule,
      isActive: fellowships.isActive,
      createdAt: fellowships.createdAt,
      updatedAt: fellowships.updatedAt,
    })
    .from(fellowships)
    .leftJoin(branches, eq(fellowships.branchId, branches.id))
    .where(and(eq(fellowships.id, id), eq(fellowships.isActive, true)));

  if (!fellowship) throw new NotFoundError('Fellowship not found');
  enforceBranchScope(auth, fellowship.branchId);
  return fellowship;
}

export async function createFellowship(
  db: Database,
  auth: AuthContext,
  data: {
    fellowshipName: string;
    branchId: string;
    fellowshipType: string;
    description?: string;
    leaderId?: string;
    coLeaderId?: string;
    meetingSchedule?: string;
    meetingDay?: string;
    meetingTime?: string;
    latitude?: number;
    longitude?: number;
    country?: string;
  },
) {
  if (!authHasCapability(auth, 'branch:read')) {
    throw new ForbiddenError('Only admins and pastors can create fellowships');
  }

  // Validate branch exists
  const [branch] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(and(eq(branches.id, data.branchId), eq(branches.isActive, true)));
  if (!branch) throw new ValidationError('Branch not found');

  // Validate leader if provided
  if (data.leaderId) {
    const [leader] = await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.id, data.leaderId), eq(members.isActive, true)));
    if (!leader) throw new ValidationError('Leader member not found');
  }

  const [fellowship] = await db
    .insert(fellowships)
    .values({
      fellowshipName: data.fellowshipName,
      branchId: data.branchId,
      fellowshipType: data.fellowshipType,
      description: data.description,
      leaderId: data.leaderId,
      coLeaderId: data.coLeaderId,
      meetingSchedule: data.meetingSchedule,
      meetingDay: data.meetingDay,
      meetingTime: data.meetingTime,
      latitude: data.latitude,
      longitude: data.longitude,
      country: data.country,
    })
    .returning();

  // Auto-join leader as fellowship member
  if (data.leaderId) {
    await db.insert(fellowshipMembers).values({
      fellowshipId: fellowship!.id,
      memberId: data.leaderId,
    });
  }

  // RBAC Phase 3c: mirror leader/co-leader FKs into member_roles. The
  // partial unique index handles concurrent inserts; nothing to await
  // serially here beyond the helper's own work.
  const leaderMemberIds = [data.leaderId, data.coLeaderId].filter((m): m is string => !!m);
  await syncFellowshipLeaderGrants(db, {
    fellowshipId: fellowship!.id,
    branchId: data.branchId,
    leaderMemberIds,
  });

  return fellowship!;
}

export async function updateFellowship(
  db: Database,
  auth: AuthContext,
  id: string,
  data: Record<string, unknown>,
) {
  if (!authHasCapability(auth, 'branch:read')) {
    throw new ForbiddenError('Only admins and pastors can update fellowships');
  }

  const existing = await getFellowship(db, auth, id);

  const [updated] = await db
    .update(fellowships)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(fellowships.id, existing.id))
    .returning();

  // RBAC Phase 3c: if leader/co-leader changed, sync member_roles. We always
  // sync if either field appears in `data` — easier to reason about than
  // tracking deltas, and idempotent.
  if ('leaderId' in data || 'coLeaderId' in data) {
    const leaderMemberIds = [updated!.leaderId, updated!.coLeaderId].filter(
      (m): m is string => !!m,
    );
    await syncFellowshipLeaderGrants(db, {
      fellowshipId: updated!.id,
      branchId: updated!.branchId,
      leaderMemberIds,
    });
  }

  return updated!;
}

export async function deactivateFellowship(db: Database, auth: AuthContext, id: string) {
  if (!authHasCapability(auth, 'branch:read')) {
    throw new ForbiddenError('Only admins and pastors can deactivate fellowships');
  }

  const existing = await getFellowship(db, auth, id);

  // Soft-deactivate all fellowship members first
  await db
    .update(fellowshipMembers)
    .set({ isActive: false, leaveDate: sql`CURRENT_DATE` })
    .where(and(eq(fellowshipMembers.fellowshipId, existing.id), eq(fellowshipMembers.isActive, true)));

  const [deactivated] = await db
    .update(fellowships)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(fellowships.id, existing.id))
    .returning();

  // RBAC Phase 3c: deactivating the fellowship deactivates the FellowshipLeader
  // grants attached to it. The FK itself stays — the grants are what gate
  // capability checks.
  await syncFellowshipLeaderGrants(db, {
    fellowshipId: deactivated!.id,
    branchId: deactivated!.branchId,
    leaderMemberIds: [],
  });

  return deactivated!;
}

// ── Fellowship Members ─────────────────────────────────────

export async function listFellowshipMembers(db: Database, auth: AuthContext, fellowshipId: string) {
  const fellowship = await getFellowship(db, auth, fellowshipId);

  // Non-admin/pastor/leader members can only see the roster if they are active members themselves.
  // RBAC Phase 4b: branch-tier admins or this fellowship's leader pass.
  const isPrivileged =
    authHasCapability(auth, 'branch:read') ||
    authHasCapability(auth, 'fellowship:read', { kind: 'fellowship', id: fellowship.id });

  if (!isPrivileged) {
    const [activeMembership] = await db
      .select({ id: fellowshipMembers.id })
      .from(fellowshipMembers)
      .where(
        and(
          eq(fellowshipMembers.fellowshipId, fellowshipId),
          eq(fellowshipMembers.memberId, auth.memberId),
          eq(fellowshipMembers.isActive, true),
        ),
      );
    if (!activeMembership) return [];
  }

  const rows = await db
    .select({
      id: fellowshipMembers.id,
      fellowshipId: fellowshipMembers.fellowshipId,
      memberId: fellowshipMembers.memberId,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      memberPhotoUrl: members.photoUrl,
      joinDate: fellowshipMembers.joinDate,
      isActive: fellowshipMembers.isActive,
      notes: fellowshipMembers.notes,
      // Joined NB enrollment for the current branch — null for members with no active enrollment.
      // Surfaced to the fellowship leader/co-leader (and admin/pastor) as a "NB Stage" chip.
      nbStage: newBelieverEnrollments.stage,
    })
    .from(fellowshipMembers)
    .innerJoin(members, eq(fellowshipMembers.memberId, members.id))
    .leftJoin(
      newBelieverEnrollments,
      and(
        eq(newBelieverEnrollments.memberId, members.id),
        eq(newBelieverEnrollments.branchId, fellowship.branchId),
        eq(newBelieverEnrollments.isActive, true),
      ),
    )
    .where(
      and(eq(fellowshipMembers.fellowshipId, fellowship.id), eq(fellowshipMembers.isActive, true)),
    );

  // Peer members (non-privileged) don't get to see each other's NB stage.
  if (isPrivileged) return rows;
  return rows.map((r) => ({ ...r, nbStage: null }));
}

export async function addFellowshipMember(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
  data: { memberId: string; notes?: string },
) {
  const fellowship = await getFellowship(db, auth, fellowshipId);
  enforceLeaderOrAbove(auth, fellowship);

  // Validate member exists
  const [member] = await db
    .select({ id: members.id, homeBranchId: members.homeBranchId, secondaryBranchId: members.secondaryBranchId, isAtSecondaryBranch: members.isAtSecondaryBranch })
    .from(members)
    .where(and(eq(members.id, data.memberId), eq(members.isActive, true)));
  if (!member) throw new NotFoundError('Member not found');

  // Check branch consistency — allow home branch or active secondary branch
  const memberActiveBranchId =
    member.isAtSecondaryBranch && member.secondaryBranchId !== null
      ? member.secondaryBranchId
      : member.homeBranchId;
  if (memberActiveBranchId !== fellowship.branchId) {
    throw new ValidationError('Member must be in the same branch as the fellowship');
  }

  // Check for duplicate active membership
  const [existing] = await db
    .select({ id: fellowshipMembers.id })
    .from(fellowshipMembers)
    .where(
      and(
        eq(fellowshipMembers.fellowshipId, fellowshipId),
        eq(fellowshipMembers.memberId, data.memberId),
        eq(fellowshipMembers.isActive, true),
      ),
    );
  if (existing) throw new ConflictError('Member is already in this fellowship');

  // Cross-fellowship type constraint: one fellowship per type per branch
  const [crossConflict] = await db
    .select({ id: fellowshipMembers.id })
    .from(fellowshipMembers)
    .innerJoin(fellowships, eq(fellowshipMembers.fellowshipId, fellowships.id))
    .where(
      and(
        eq(fellowshipMembers.memberId, data.memberId),
        eq(fellowshipMembers.isActive, true),
        eq(fellowships.fellowshipType, fellowship.fellowshipType),
        eq(fellowships.branchId, fellowship.branchId!),
      ),
    )
    .limit(1);
  if (crossConflict) {
    throw new ConflictError(`Member is already in a ${fellowship.fellowshipType} fellowship in this branch`);
  }

  const [record] = await db
    .insert(fellowshipMembers)
    .values({
      fellowshipId,
      memberId: data.memberId,
      notes: data.notes,
    })
    .returning();

  return record!;
}

export async function removeFellowshipMember(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
  memberId: string,
) {
  const fellowship = await getFellowship(db, auth, fellowshipId);
  enforceLeaderOrAbove(auth, fellowship);

  const [record] = await db
    .update(fellowshipMembers)
    .set({ isActive: false, leaveDate: sql`CURRENT_DATE` })
    .where(
      and(
        eq(fellowshipMembers.fellowshipId, fellowshipId),
        eq(fellowshipMembers.memberId, memberId),
        eq(fellowshipMembers.isActive, true),
      ),
    )
    .returning();

  if (!record) throw new NotFoundError('Fellowship member not found');
  return record;
}

// ── Fellowship Meetings ────────────────────────────────────

export async function listMeetings(db: Database, auth: AuthContext, fellowshipId: string) {
  const fellowship = await getFellowship(db, auth, fellowshipId);

  return db
    .select()
    .from(fellowshipMeetings)
    .where(eq(fellowshipMeetings.fellowshipId, fellowship.id))
    .orderBy(sql`${fellowshipMeetings.meetingDate} DESC`);
}

export async function createMeeting(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
  data: {
    meetingDate: string;
    meetingTitle?: string;
    meetingTopic?: string;
    meetingNotes?: string;
    location?: string;
    durationMinutes?: number;
  },
) {
  const fellowship = await getFellowship(db, auth, fellowshipId);
  enforceLeaderOrAbove(auth, fellowship);

  const [meeting] = await db
    .insert(fellowshipMeetings)
    .values({
      fellowshipId: fellowship.id,
      meetingDate: new Date(data.meetingDate),
      meetingTitle: data.meetingTitle,
      meetingTopic: data.meetingTopic,
      meetingNotes: data.meetingNotes,
      location: data.location,
      durationMinutes: data.durationMinutes,
      createdBy: auth.memberId,
    })
    .returning();

  return meeting!;
}

export async function updateMeeting(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
  meetingId: string,
  data: Record<string, unknown>,
) {
  const fellowship = await getFellowship(db, auth, fellowshipId);
  enforceLeaderOrAbove(auth, fellowship);

  const [meeting] = await db
    .update(fellowshipMeetings)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(fellowshipMeetings.id, meetingId), eq(fellowshipMeetings.fellowshipId, fellowshipId)))
    .returning();

  if (!meeting) throw new NotFoundError('Meeting not found');
  return meeting;
}

// ── Attendance ─────────────────────────────────────────────

export async function recordAttendance(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
  meetingId: string,
  records: { memberId: string; attendanceStatus: string; notes?: string }[],
) {
  const fellowship = await getFellowship(db, auth, fellowshipId);
  enforceLeaderOrAbove(auth, fellowship);

  // Verify the meeting belongs to this fellowship
  const [meeting] = await db
    .select({ id: fellowshipMeetings.id })
    .from(fellowshipMeetings)
    .where(and(eq(fellowshipMeetings.id, meetingId), eq(fellowshipMeetings.fellowshipId, fellowshipId)));
  if (!meeting) throw new NotFoundError('Meeting not found');

  // Upsert attendance records
  const values = records.map((r) => ({
    meetingId,
    memberId: r.memberId,
    attendanceStatus: r.attendanceStatus,
    notes: r.notes,
    recordedBy: auth.memberId,
  }));

  await db
    .insert(fellowshipMeetingAttendance)
    .values(values)
    .onConflictDoUpdate({
      target: [fellowshipMeetingAttendance.meetingId, fellowshipMeetingAttendance.memberId],
      set: {
        attendanceStatus: sql`EXCLUDED.attendance_status`,
        notes: sql`EXCLUDED.notes`,
        recordedBy: sql`EXCLUDED.recorded_by`,
        recordedAt: sql`CURRENT_TIMESTAMP`,
      },
    });
}

export async function getMeetingAttendance(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
  meetingId: string,
) {
  await getFellowship(db, auth, fellowshipId);

  return db
    .select({
      meetingId: fellowshipMeetingAttendance.meetingId,
      memberId: fellowshipMeetingAttendance.memberId,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      attendanceStatus: fellowshipMeetingAttendance.attendanceStatus,
      notes: fellowshipMeetingAttendance.notes,
      recordedAt: fellowshipMeetingAttendance.recordedAt,
    })
    .from(fellowshipMeetingAttendance)
    .innerJoin(members, eq(fellowshipMeetingAttendance.memberId, members.id))
    .where(eq(fellowshipMeetingAttendance.meetingId, meetingId));
}

// ── Fellowship aggregate stats (analytics) ─────────────────
//
// Single round-trip aggregation for the reports page — replaces the 4
// list-endpoint fan-out (members / meetings / followups / join-requests)
// the FellowshipReportPanel previously stitched together client-side.
// Visibility: fellowship leader / co-leader / pastor / admin.

export async function getFellowshipStats(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
) {
  const fellowship = await getFellowship(db, auth, fellowshipId);
  const isLeadOrCo =
    fellowship.leaderId === auth.memberId || fellowship.coLeaderId === auth.memberId;
  if (
    !authHasCapability(auth, 'branch:read') &&
    !isLeadOrCo
  ) {
    throw new ForbiddenError('Only the fellowship lead/co-lead or branch admin can view this');
  }

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const memberRows = await db
    .select({
      total: count(),
      active: sql<number>`COUNT(*) FILTER (WHERE ${fellowshipMembers.isActive} = true)::int`,
    })
    .from(fellowshipMembers)
    .where(eq(fellowshipMembers.fellowshipId, fellowshipId));
  const totalMembers = Number(memberRows[0]?.total ?? 0);
  const activeMembers = Number(memberRows[0]?.active ?? 0);

  const meetingRows = await db
    .select({
      week: sql<Date>`date_trunc('week', ${fellowshipMeetings.meetingDate})`.as('w'),
      c: count(),
    })
    .from(fellowshipMeetings)
    .where(
      and(
        eq(fellowshipMeetings.fellowshipId, fellowshipId),
        gte(fellowshipMeetings.meetingDate, ninetyDaysAgo),
      ),
    )
    .groupBy(sql`date_trunc('week', ${fellowshipMeetings.meetingDate})`)
    .orderBy(sql`date_trunc('week', ${fellowshipMeetings.meetingDate})`);

  let meetingsLast90d = 0;
  const meetingsByWeek = meetingRows.map((r) => {
    const c = Number(r.c);
    meetingsLast90d += c;
    return {
      week: new Date(r.week as Date | string).toISOString().slice(0, 10),
      count: c,
    };
  });

  const followupRows = await db
    .select({
      total: count(),
      closed: sql<number>`COUNT(*) FILTER (WHERE LOWER(${fellowshipFollowups.contactStatus}) IN ('completed', 'closed'))::int`,
    })
    .from(fellowshipFollowups)
    .where(eq(fellowshipFollowups.fellowshipId, fellowshipId));
  const totalFollowups = Number(followupRows[0]?.total ?? 0);
  const closedFollowups = Number(followupRows[0]?.closed ?? 0);

  const joinRows = await db
    .select({
      recent: sql<number>`COUNT(*) FILTER (WHERE ${fellowshipJoinRequests.createdAt} >= ${thirtyDaysAgo} AND ${fellowshipJoinRequests.status} != 'rejected')::int`,
      pending: sql<number>`COUNT(*) FILTER (WHERE ${fellowshipJoinRequests.status} = 'pending')::int`,
    })
    .from(fellowshipJoinRequests)
    .where(eq(fellowshipJoinRequests.fellowshipId, fellowshipId));
  const recentJoinRequests = Number(joinRows[0]?.recent ?? 0);
  const pendingJoinRequests = Number(joinRows[0]?.pending ?? 0);

  return {
    fellowship: {
      id: fellowship.id,
      name: fellowship.fellowshipName,
      branchName: fellowship.branchName,
    },
    members: {
      total: totalMembers,
      active: activeMembers,
      inactive: Math.max(0, totalMembers - activeMembers),
    },
    meetings: {
      last90d: meetingsLast90d,
      byWeek: meetingsByWeek,
    },
    followups: {
      total: totalFollowups,
      open: Math.max(0, totalFollowups - closedFollowups),
      closed: closedFollowups,
    },
    joinRequests: {
      recent30d: recentJoinRequests,
      pending: pendingJoinRequests,
    },
  };
}

export async function getAttendanceSummary(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
) {
  const fellowship = await getFellowship(db, auth, fellowshipId);

  const stats = await db
    .select({
      meetingId: fellowshipMeetingAttendance.meetingId,
      meetingDate: fellowshipMeetings.meetingDate,
      total: count(),
      present: sql<number>`COUNT(*) FILTER (WHERE ${fellowshipMeetingAttendance.attendanceStatus} = 'Present')`,
      absent: sql<number>`COUNT(*) FILTER (WHERE ${fellowshipMeetingAttendance.attendanceStatus} = 'Absent')`,
      excused: sql<number>`COUNT(*) FILTER (WHERE ${fellowshipMeetingAttendance.attendanceStatus} = 'Excused')`,
      late: sql<number>`COUNT(*) FILTER (WHERE ${fellowshipMeetingAttendance.attendanceStatus} = 'Late')`,
    })
    .from(fellowshipMeetingAttendance)
    .innerJoin(
      fellowshipMeetings,
      eq(fellowshipMeetingAttendance.meetingId, fellowshipMeetings.id),
    )
    .where(eq(fellowshipMeetings.fellowshipId, fellowship.id))
    .groupBy(fellowshipMeetingAttendance.meetingId, fellowshipMeetings.meetingDate)
    .orderBy(sql`${fellowshipMeetings.meetingDate} DESC`);

  return stats;
}

// ── Fellowship Join Requests ───────────────────────────────

export async function createJoinRequest(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
  data: { notes?: string },
) {
  const fellowship = await getFellowship(db, auth, fellowshipId);

  const [activeMembership] = await db
    .select({ id: fellowshipMembers.id })
    .from(fellowshipMembers)
    .where(
      and(
        eq(fellowshipMembers.fellowshipId, fellowshipId),
        eq(fellowshipMembers.memberId, auth.memberId),
        eq(fellowshipMembers.isActive, true),
      ),
    );
  if (activeMembership) throw new ConflictError('You are already a member of this fellowship');

  // Check if previously removed from this fellowship
  const [previousMembership] = await db
    .select({ id: fellowshipMembers.id })
    .from(fellowshipMembers)
    .where(
      and(
        eq(fellowshipMembers.fellowshipId, fellowshipId),
        eq(fellowshipMembers.memberId, auth.memberId),
        eq(fellowshipMembers.isActive, false),
      ),
    );
  if (previousMembership) throw new ConflictError('You cannot request to join this fellowship at this time, please contact Admin');

  const [pendingRequest] = await db
    .select({ id: fellowshipJoinRequests.id })
    .from(fellowshipJoinRequests)
    .where(
      and(
        eq(fellowshipJoinRequests.fellowshipId, fellowshipId),
        eq(fellowshipJoinRequests.memberId, auth.memberId),
        eq(fellowshipJoinRequests.status, 'pending'),
      ),
    );
  if (pendingRequest) throw new ConflictError('You already have a pending join request for this fellowship');

  // Cross-fellowship type constraint
  const [crossConflict] = await db
    .select({ id: fellowshipMembers.id })
    .from(fellowshipMembers)
    .innerJoin(fellowships, eq(fellowshipMembers.fellowshipId, fellowships.id))
    .where(
      and(
        eq(fellowshipMembers.memberId, auth.memberId),
        eq(fellowshipMembers.isActive, true),
        eq(fellowships.fellowshipType, fellowship.fellowshipType),
        eq(fellowships.branchId, fellowship.branchId!),
      ),
    )
    .limit(1);
  if (crossConflict) {
    throw new ConflictError(`You are already in a ${fellowship.fellowshipType} fellowship in this branch`);
  }

  const [request] = await db
    .insert(fellowshipJoinRequests)
    .values({ fellowshipId, memberId: auth.memberId, notes: data.notes })
    .returning();

  // Fire confirmation email to requester — non-blocking, transactional
  const [requester] = await db
    .select({ email: members.email, firstName: members.firstName, lastName: members.lastName })
    .from(members)
    .where(eq(members.id, auth.memberId));
  if (requester?.email) {
    sendJoinRequestReceivedEmail(
      requester.email,
      requester.firstName,
      fellowship.fellowshipName,
    ).catch(() => { /* email failure is non-fatal */ });
  }

  // Workflow notification to leadership chain
  const [branchAuth, fellowshipLeaders] = await Promise.all([
    resolveBranchAuthority(db, fellowship.branchId!),
    resolveFellowshipLeaders(db, fellowshipId),
  ]);
  const requesterName = requester
    ? `${requester.firstName} ${requester.lastName ?? ''}`.trim()
    : 'A member';
  await dispatchNotification(db, {
    eventType: NotificationEventType.WorkflowFellowshipJoinRequestReceived,
    recipientMemberIds: [...branchAuth, ...fellowshipLeaders],
    branchId: fellowship.branchId!,
    subjectType: 'fellowship_join_request',
    subjectId: request!.id,
    payload: {
      requesterName,
      targetName: fellowship.fellowshipName,
      targetKind: 'fellowship',
      portalUrl: joinRequestPortalUrl(fellowshipId),
    },
  });

  return request!;
}

export async function listJoinRequests(db: Database, auth: AuthContext, fellowshipId: string) {
  const fellowship = await getFellowship(db, auth, fellowshipId);
  enforceLeaderOrAbove(auth, fellowship);

  return db
    .select({
      id: fellowshipJoinRequests.id,
      fellowshipId: fellowshipJoinRequests.fellowshipId,
      memberId: fellowshipJoinRequests.memberId,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      memberPhotoUrl: members.photoUrl,
      status: fellowshipJoinRequests.status,
      notes: fellowshipJoinRequests.notes,
      reviewedBy: fellowshipJoinRequests.reviewedBy,
      reviewedAt: fellowshipJoinRequests.reviewedAt,
      createdAt: fellowshipJoinRequests.createdAt,
      updatedAt: fellowshipJoinRequests.updatedAt,
    })
    .from(fellowshipJoinRequests)
    .innerJoin(members, eq(fellowshipJoinRequests.memberId, members.id))
    .where(
      and(
        eq(fellowshipJoinRequests.fellowshipId, fellowship.id),
        eq(fellowshipJoinRequests.status, 'pending'),
      ),
    )
    .orderBy(fellowshipJoinRequests.createdAt);
}

export async function reviewJoinRequest(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
  requestId: string,
  data: { status: 'approved' | 'rejected'; notes?: string },
) {
  const fellowship = await getFellowship(db, auth, fellowshipId);
  enforceLeaderOrAbove(auth, fellowship);

  const [request] = await db
    .select()
    .from(fellowshipJoinRequests)
    .where(
      and(
        eq(fellowshipJoinRequests.id, requestId),
        eq(fellowshipJoinRequests.fellowshipId, fellowshipId),
        eq(fellowshipJoinRequests.status, 'pending'),
      ),
    );
  if (!request) throw new NotFoundError('Join request not found or already reviewed');

  const [updated] = await db
    .update(fellowshipJoinRequests)
    .set({
      status: data.status,
      notes: data.notes ?? request.notes,
      reviewedBy: auth.memberId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(fellowshipJoinRequests.id, requestId))
    .returning();

  if (data.status === 'approved') {
    // Check if member already has a record in this fellowship (e.g. previously left)
    const [existing] = await db
      .select({ id: fellowshipMembers.id })
      .from(fellowshipMembers)
      .where(
        and(
          eq(fellowshipMembers.fellowshipId, fellowshipId),
          eq(fellowshipMembers.memberId, request.memberId),
        ),
      );
    if (existing) {
      await db
        .update(fellowshipMembers)
        .set({ isActive: true, leaveDate: null, updatedAt: new Date() })
        .where(eq(fellowshipMembers.id, existing.id));
    } else {
      await db
        .insert(fellowshipMembers)
        .values({ fellowshipId, memberId: request.memberId });
    }
  }

  // Fire outcome email — non-blocking, transactional
  const [reviewee] = await db
    .select({ email: members.email, firstName: members.firstName })
    .from(members)
    .where(eq(members.id, request.memberId));
  if (reviewee?.email) {
    const sendFn =
      data.status === 'approved'
        ? sendJoinRequestApprovedEmail
        : sendJoinRequestRejectedEmail;
    sendFn(reviewee.email, reviewee.firstName, fellowship.fellowshipName).catch(() => {
      /* email failure is non-fatal */
    });
  }

  await dispatchNotification(db, {
    eventType: NotificationEventType.WorkflowFellowshipJoinRequestDecided,
    recipientMemberIds: [request.memberId],
    branchId: fellowship.branchId!,
    subjectType: 'fellowship_join_request',
    subjectId: request.id,
    payload: {
      targetName: fellowship.fellowshipName,
      targetKind: 'fellowship',
      decision: data.status,
      portalUrl: joinRequestPortalUrl(fellowshipId),
    },
  });

  return updated!;
}

// ── Map data (gracefully handles missing location columns) ──

export async function listFellowshipsForMap(db: Database, _auth: AuthContext) {
  try {
    const rows = await db.execute(sql`
      SELECT
        f.id,
        f.fellowship_name AS "fellowshipName",
        f.branch_id AS "branchId",
        b.branch_name AS "branchName",
        f.fellowship_type AS "fellowshipType",
        f.description,
        f.meeting_schedule AS "meetingSchedule",
        f.meeting_day AS "meetingDay",
        f.meeting_time AS "meetingTime",
        f.latitude,
        f.longitude,
        f.country
      FROM fellowships f
      LEFT JOIN branches b ON f.branch_id = b.id
      WHERE f.is_active = true
        AND f.latitude IS NOT NULL
        AND f.longitude IS NOT NULL
    `);
    // postgres-js `db.execute` returns the RowList (an array) directly.
    return rows;
  } catch {
    // If columns don't exist yet (migration not run), return empty
    return [];
  }
}

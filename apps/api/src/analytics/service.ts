import { count, eq, and, sql, gte, inArray } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  branches,
  members,
  fellowships,
  fellowshipMembers,
  fellowshipMeetings,
  fellowshipMeetingAttendance,
} from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import { ForbiddenError } from '@kairos/utils';
import { isRealMember } from '../lib/member-predicates';

/**
 * Task #33 Phase 2 follow-up: split the member roll into the four real
 * categories the church uses. Members are those who completed the class.
 * Returners attend regularly without formal class. Visitors are occasional.
 * Children are under-16 (separate cohort because of safeguarding rules).
 *
 * The four counts always sum to the total roll (members + returners +
 * visitors + children = totalRoll). Callers display total prominently and
 * break the sub-counts down beneath.
 */
async function loadMemberBreakdown(
  db: Database,
  branchFilter: import('drizzle-orm').SQL | undefined,
): Promise<{
  total: number;
  members: number;
  returners: number;
  visitors: number;
  children: number;
}> {
  const baseConds = branchFilter
    ? and(eq(members.isActive, true), branchFilter)
    : eq(members.isActive, true);

  const [confirmedRow, returnersRow, visitorsRow, childrenRow, totalRow] = await Promise.all([
    db.select({ value: count() }).from(members).where(and(baseConds, isRealMember())),
    db.select({ value: count() }).from(members).where(and(baseConds, eq(members.memberType, 'attendee'))),
    db.select({ value: count() }).from(members).where(and(baseConds, eq(members.memberType, 'visitor'))),
    db.select({ value: count() }).from(members).where(and(baseConds, eq(members.memberType, 'child'))),
    db.select({ value: count() }).from(members).where(baseConds),
  ]);

  return {
    total: totalRow[0]!.value,
    members: confirmedRow[0]!.value,
    returners: returnersRow[0]!.value,
    visitors: visitorsRow[0]!.value,
    children: childrenRow[0]!.value,
  };
}

// ── Admin Stats (church-wide) ──────────────────────────────

export async function getAdminStats(db: Database, auth: AuthContext) {
  if (auth.systemRole !== 'admin') {
    throw new ForbiddenError('Only admins can access church-wide stats');
  }

  const [[branchCount], breakdown, [fellowshipCount]] = await Promise.all([
    db.select({ value: count() }).from(branches).where(eq(branches.isActive, true)),
    loadMemberBreakdown(db, undefined),
    db.select({ value: count() }).from(fellowships).where(eq(fellowships.isActive, true)),
  ]);

  // Members by approval status — kept as confirmed Members only because the
  // tile is "pending approvals" for the formal Member roll. Attendee/visitor
  // shells live under their own admin surfaces.
  const approvalStats = await db
    .select({
      status: members.approvalStatus,
      count: count(),
    })
    .from(members)
    .where(and(eq(members.isActive, true), isRealMember()))
    .groupBy(members.approvalStatus);

  // Fellowships by type
  const fellowshipsByType = await db
    .select({
      type: fellowships.fellowshipType,
      count: count(),
    })
    .from(fellowships)
    .where(eq(fellowships.isActive, true))
    .groupBy(fellowships.fellowshipType);

  return {
    totalBranches: branchCount!.value,
    // Headline number: everyone active on the books. The old totalMembers
    // (confirmed-only) survives as memberBreakdown.members.
    totalRoll: breakdown.total,
    memberBreakdown: {
      members: breakdown.members,
      returners: breakdown.returners,
      visitors: breakdown.visitors,
      children: breakdown.children,
    },
    // Back-compat: keep totalMembers populated with the confirmed count so
    // older UI consumers don't silently swap denominators. New consumers
    // should read totalRoll + memberBreakdown.
    totalMembers: breakdown.members,
    totalFellowships: fellowshipCount!.value,
    membersByApproval: approvalStats,
    fellowshipsByType,
  };
}

// ── Branch Stats (pastor dashboard) ────────────────────────

export async function getBranchStats(db: Database, auth: AuthContext) {
  // Phase 4: a scope=branch:X login is acting AS branch X, even if their
  // member.homeBranchId differs. Render the stats against the scoped branch
  // so the dashboard tile a scoped-branch-admin sees actually matches the
  // role they picked at /select-role.
  const branchId =
    auth.scope?.kind === 'branch' ? auth.scope.id : auth.branchId;

  const [breakdown, [fellowshipCount], [recentMeetingCount]] = await Promise.all([
    loadMemberBreakdown(db, eq(members.homeBranchId, branchId)),
    db
      .select({ value: count() })
      .from(fellowships)
      .where(and(eq(fellowships.branchId, branchId), eq(fellowships.isActive, true))),
    db
      .select({ value: count() })
      .from(fellowshipMeetings)
      .innerJoin(fellowships, eq(fellowshipMeetings.fellowshipId, fellowships.id))
      .where(
        and(
          eq(fellowships.branchId, branchId),
          gte(fellowshipMeetings.meetingDate, sql`CURRENT_DATE - INTERVAL '30 days'`),
        ),
      ),
  ]);

  // Pending approvals for this branch. Self-signup members are inactive
  // (is_active = false) until an admin approves them, so we do NOT filter on
  // is_active here — mirrors the carve-out in listMembers for pending queries.
  // Attendee shells count too: /members/approval surfaces them, so the tile
  // must match.
  const [pendingCount] = await db
    .select({ value: count() })
    .from(members)
    .where(
      and(
        eq(members.homeBranchId, branchId),
        eq(members.approvalStatus, 'pending'),
      ),
    );

  // Weekly attendance trend (last 8 weeks)
  const attendanceTrend = await db
    .select({
      week: sql<string>`TO_CHAR(DATE_TRUNC('week', ${fellowshipMeetings.meetingDate}), 'YYYY-MM-DD')`,
      total: count(fellowshipMeetingAttendance.memberId),
      present: sql<number>`COUNT(CASE WHEN ${fellowshipMeetingAttendance.attendanceStatus} = 'Present' THEN 1 END)`,
    })
    .from(fellowshipMeetings)
    .innerJoin(fellowships, eq(fellowshipMeetings.fellowshipId, fellowships.id))
    .leftJoin(
      fellowshipMeetingAttendance,
      eq(fellowshipMeetings.id, fellowshipMeetingAttendance.meetingId),
    )
    .where(
      and(
        eq(fellowships.branchId, branchId),
        gte(fellowshipMeetings.meetingDate, sql`CURRENT_DATE - INTERVAL '56 days'`),
      ),
    )
    .groupBy(sql`DATE_TRUNC('week', ${fellowshipMeetings.meetingDate})`)
    .orderBy(sql`DATE_TRUNC('week', ${fellowshipMeetings.meetingDate})`);

  return {
    totalRoll: breakdown.total,
    memberBreakdown: {
      members: breakdown.members,
      returners: breakdown.returners,
      visitors: breakdown.visitors,
      children: breakdown.children,
    },
    // Back-compat: see getAdminStats note above.
    totalMembers: breakdown.members,
    totalFellowships: fellowshipCount!.value,
    recentMeetings: recentMeetingCount!.value,
    pendingApprovals: pendingCount!.value,
    attendanceTrend: attendanceTrend.map((row) => ({
      week: row.week,
      rate: row.total > 0 ? Math.round((Number(row.present) / row.total) * 100) : 0,
    })),
  };
}

// ── Fellowship Stats (fellowship page summary) ─────────────

export async function getFellowshipStats(db: Database, auth: AuthContext) {
  // Phase 4: scope=branch pins the stats to the scoped branch even for system
  // admins; otherwise admin sees church-wide and other roles see their own
  // home branch.
  const branchId =
    auth.scope?.kind === 'branch'
      ? auth.scope.id
      : auth.systemRole === 'admin'
        ? undefined
        : auth.branchId;

  // Count active branches, members (with breakdown), fellowships
  const [[branchCount], breakdown, [fellowshipCount]] = await Promise.all([
    branchId
      ? db.select({ value: count() }).from(branches).where(and(eq(branches.id, branchId), eq(branches.isActive, true)))
      : db.select({ value: count() }).from(branches).where(eq(branches.isActive, true)),
    loadMemberBreakdown(db, branchId ? eq(members.homeBranchId, branchId) : undefined),
    branchId
      ? db.select({ value: count() }).from(fellowships).where(and(eq(fellowships.branchId, branchId), eq(fellowships.isActive, true)))
      : db.select({ value: count() }).from(fellowships).where(eq(fellowships.isActive, true)),
  ]);

  // Get attendance breakdown by status for last 30 days
  const attendanceData = await db
    .select({
      total: count(fellowshipMeetingAttendance.memberId),
      present: sql<number>`COUNT(CASE WHEN ${fellowshipMeetingAttendance.attendanceStatus} = 'Present' THEN 1 END)`,
      late: sql<number>`COUNT(CASE WHEN ${fellowshipMeetingAttendance.attendanceStatus} = 'Late' THEN 1 END)`,
      absent: sql<number>`COUNT(CASE WHEN ${fellowshipMeetingAttendance.attendanceStatus} = 'Absent' THEN 1 END)`,
      excused: sql<number>`COUNT(CASE WHEN ${fellowshipMeetingAttendance.attendanceStatus} = 'Excused' THEN 1 END)`,
    })
    .from(fellowshipMeetings)
    .innerJoin(fellowships, eq(fellowshipMeetings.fellowshipId, fellowships.id))
    .leftJoin(
      fellowshipMeetingAttendance,
      eq(fellowshipMeetings.id, fellowshipMeetingAttendance.meetingId),
    )
    .where(
      and(
        branchId ? eq(fellowships.branchId, branchId) : undefined,
        gte(fellowshipMeetings.meetingDate, sql`CURRENT_DATE - INTERVAL '30 days'`),
      ),
    );

  const totalAttendance = attendanceData[0]?.total ?? 0;
  const presentCount = Number(attendanceData[0]?.present ?? 0);
  const lateCount = Number(attendanceData[0]?.late ?? 0);
  const absentCount = Number(attendanceData[0]?.absent ?? 0);
  const excusedCount = Number(attendanceData[0]?.excused ?? 0);
  const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  // Calculate engagement level based on meeting frequency and attendance
  const recentMeetingsCount = await db
    .select({ value: count() })
    .from(fellowshipMeetings)
    .innerJoin(fellowships, eq(fellowshipMeetings.fellowshipId, fellowships.id))
    .where(
      and(
        branchId ? eq(fellowships.branchId, branchId) : undefined,
        gte(fellowshipMeetings.meetingDate, sql`CURRENT_DATE - INTERVAL '30 days'`),
      ),
    );

  const meetingsPerFellowship = fellowshipCount!.value > 0 
    ? recentMeetingsCount[0]!.value / fellowshipCount!.value 
    : 0;

  // Engagement: High if attendance > 70% and meetings > 3/month, Low if attendance < 50% or meetings < 2/month
  let engagement: 'High' | 'Medium' | 'Low';
  if (attendanceRate >= 70 && meetingsPerFellowship >= 3) {
    engagement = 'High';
  } else if (attendanceRate < 50 || meetingsPerFellowship < 2) {
    engagement = 'Low';
  } else {
    engagement = 'Medium';
  }

  return {
    totalBranches: branchCount!.value,
    totalRoll: breakdown.total,
    memberBreakdown: {
      members: breakdown.members,
      returners: breakdown.returners,
      visitors: breakdown.visitors,
      children: breakdown.children,
    },
    // Back-compat: see getAdminStats note above.
    totalMembers: breakdown.members,
    totalFellowships: fellowshipCount!.value,
    attendanceRate,
    attendanceBreakdown: {
      present: presentCount,
      late: lateCount,
      absent: absentCount,
      excused: excusedCount,
      total: totalAttendance,
    },
    engagement,
  };
}

// ── Member Stats (personal dashboard) ──────────────────────

export async function getMemberStats(db: Database, auth: AuthContext) {
  const memberId = auth.memberId;

  // Fellowships this member belongs to
  const myFellowships = await db
    .select({
      fellowshipId: fellowships.id,
      fellowshipName: fellowships.fellowshipName,
      fellowshipType: fellowships.fellowshipType,
    })
    .from(fellowshipMembers)
    .innerJoin(fellowships, eq(fellowshipMembers.fellowshipId, fellowships.id))
    .where(and(eq(fellowshipMembers.memberId, memberId), eq(fellowshipMembers.isActive, true)));

  // Branches this member belongs to (home + secondary)
  const memberRecord = await db
    .select({
      homeBranchId: members.homeBranchId,
      secondaryBranchId: members.secondaryBranchId,
    })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);

  const branchIds: string[] = [];
  if (memberRecord[0]?.homeBranchId) branchIds.push(memberRecord[0].homeBranchId);
  if (memberRecord[0]?.secondaryBranchId) branchIds.push(memberRecord[0].secondaryBranchId);

  const myBranches = branchIds.length > 0
    ? await db
        .select({ id: branches.id, branchName: branches.branchName })
        .from(branches)
        .where(inArray(branches.id, branchIds))
    : [];

  const branchList = myBranches.map(b => ({
    branchId: b.id,
    branchName: b.branchName,
    isHome: b.id === memberRecord[0]?.homeBranchId,
  }));

  // Recent attendance (last 30 days)
  const attendanceRecords = await db
    .select({
      status: fellowshipMeetingAttendance.attendanceStatus,
      count: count(),
    })
    .from(fellowshipMeetingAttendance)
    .innerJoin(
      fellowshipMeetings,
      eq(fellowshipMeetingAttendance.meetingId, fellowshipMeetings.id),
    )
    .where(
      and(
        eq(fellowshipMeetingAttendance.memberId, memberId),
        gte(fellowshipMeetings.meetingDate, sql`CURRENT_DATE - INTERVAL '30 days'`),
      ),
    )
    .groupBy(fellowshipMeetingAttendance.attendanceStatus);

  const totalAttendance = attendanceRecords.reduce((sum, r) => sum + r.count, 0);
  const presentCount = attendanceRecords.find((r) => r.status === 'Present')?.count ?? 0;
  const lateCount = attendanceRecords.find((r) => r.status === 'Late')?.count ?? 0;
  const absentCount = attendanceRecords.find((r) => r.status === 'Absent')?.count ?? 0;

  return {
    fellowshipsJoined: myFellowships.length,
    fellowships: myFellowships,
    branchCount: branchList.length,
    branches: branchList,
    recentAttendance: {
      total: totalAttendance,
      present: presentCount,
      late: lateCount,
      absent: absentCount,
      rate: totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0,
    },
  };
}

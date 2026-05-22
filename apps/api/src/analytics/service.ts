import { count, eq, and, sql, gte } from 'drizzle-orm';
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

// ── Admin Stats (church-wide) ──────────────────────────────

export async function getAdminStats(db: Database, auth: AuthContext) {
  if (auth.systemRole !== 'admin') {
    throw new ForbiddenError('Only admins can access church-wide stats');
  }

  const [[branchCount], [memberCount], [fellowshipCount]] = await Promise.all([
    db.select({ value: count() }).from(branches).where(eq(branches.isActive, true)),
    db
      .select({ value: count() })
      .from(members)
      .where(and(eq(members.isActive, true), eq(members.memberType, 'member'))),
    db.select({ value: count() }).from(fellowships).where(eq(fellowships.isActive, true)),
  ]);

  // Members by approval status
  const approvalStats = await db
    .select({
      status: members.approvalStatus,
      count: count(),
    })
    .from(members)
    .where(and(eq(members.isActive, true), eq(members.memberType, 'member')))
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
    totalMembers: memberCount!.value,
    totalFellowships: fellowshipCount!.value,
    membersByApproval: approvalStats,
    fellowshipsByType,
  };
}

// ── Branch Stats (pastor dashboard) ────────────────────────

export async function getBranchStats(db: Database, auth: AuthContext) {
  const branchId = auth.branchId;

  const [[memberCount], [fellowshipCount], [recentMeetingCount]] = await Promise.all([
    db
      .select({ value: count() })
      .from(members)
      .where(
        and(
          eq(members.homeBranchId, branchId),
          eq(members.isActive, true),
          eq(members.memberType, 'member'),
        ),
      ),
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

  // Pending approvals for this branch
  const [pendingCount] = await db
    .select({ value: count() })
    .from(members)
    .where(
      and(
        eq(members.homeBranchId, branchId),
        eq(members.approvalStatus, 'pending'),
        eq(members.isActive, true),
        eq(members.memberType, 'member'),
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
    totalMembers: memberCount!.value,
    totalFellowships: fellowshipCount!.value,
    recentMeetings: recentMeetingCount!.value,
    pendingApprovals: pendingCount!.value,
    attendanceTrend: attendanceTrend.map((row) => ({
      week: row.week,
      rate: row.total > 0 ? Math.round((Number(row.present) / row.total) * 100) : 0,
    })),
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

  return {
    fellowshipsJoined: myFellowships.length,
    fellowships: myFellowships,
    recentAttendance: {
      total: totalAttendance,
      present: presentCount,
      rate: totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0,
    },
  };
}

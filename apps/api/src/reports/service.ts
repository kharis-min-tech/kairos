import { count, eq, and, sql, gte } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  members,
  fellowships,
  fellowshipMeetings,
  fellowshipMeetingAttendance,
} from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import { isPastoralMember } from '../lib/member-predicates';

function branchScope(auth: AuthContext) {
  // Phase 4: scope=branch pins reports to the scoped branch even for system
  // admins. Otherwise admin = church-wide, everyone else = home branch.
  if (auth.scope?.kind === 'branch') return auth.scope.id;
  if (auth.systemRole === 'admin') return undefined;
  return auth.branchId;
}

// Monthly new member signups (last 6 months)
export async function getMemberGrowth(db: Database, auth: AuthContext) {
  const scopedBranchId = branchScope(auth);

  const conditions = [
    gte(members.createdAt, sql`CURRENT_DATE - INTERVAL '6 months'`),
    // Growth chart tracks new sign-ups on the pastoral roll — Members +
    // Attendees. Previously filtered to confirmed Members only, so a fresh
    // signup didn't count until class completion (months later) and the
    // chart under-reported real growth.
    isPastoralMember(),
  ];
  if (scopedBranchId) {
    conditions.push(eq(members.homeBranchId, scopedBranchId));
  }

  const rows = await db
    .select({
      month: sql<string>`TO_CHAR(DATE_TRUNC('month', ${members.createdAt}), 'YYYY-MM')`,
      newSignups: count(),
    })
    .from(members)
    .where(and(...conditions))
    .groupBy(sql`DATE_TRUNC('month', ${members.createdAt})`)
    .orderBy(sql`DATE_TRUNC('month', ${members.createdAt})`);

  return rows;
}

// Weekly attendance rates (last 8 weeks)
export async function getAttendanceTrend(db: Database, auth: AuthContext) {
  const scopedBranchId = branchScope(auth);

  const conditions = [
    gte(fellowshipMeetings.meetingDate, sql`CURRENT_DATE - INTERVAL '56 days'`),
  ];
  if (scopedBranchId) {
    conditions.push(eq(fellowships.branchId, scopedBranchId));
  }

  const rows = await db
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
    .where(and(...conditions))
    .groupBy(sql`DATE_TRUNC('week', ${fellowshipMeetings.meetingDate})`)
    .orderBy(sql`DATE_TRUNC('week', ${fellowshipMeetings.meetingDate})`);

  return rows.map((row) => ({
    week: row.week,
    rate: row.total > 0 ? Math.round((Number(row.present) / row.total) * 100) : 0,
  }));
}

// Fellowship activity summary
export async function getFellowshipActivity(db: Database, auth: AuthContext) {
  const scopedBranchId = branchScope(auth);

  const conditions = [eq(fellowships.isActive, true)];
  if (scopedBranchId) {
    conditions.push(eq(fellowships.branchId, scopedBranchId));
  }

  const rows = await db
    .select({
      fellowshipName: fellowships.fellowshipName,
      meetingCount: count(fellowshipMeetings.id),
      totalAttendees: sql<number>`COUNT(${fellowshipMeetingAttendance.memberId})`,
    })
    .from(fellowships)
    .leftJoin(fellowshipMeetings, eq(fellowships.id, fellowshipMeetings.fellowshipId))
    .leftJoin(
      fellowshipMeetingAttendance,
      eq(fellowshipMeetings.id, fellowshipMeetingAttendance.meetingId),
    )
    .where(and(...conditions))
    .groupBy(fellowships.id, fellowships.fellowshipName)
    .orderBy(fellowships.fellowshipName);

  return rows.map((row) => ({
    fellowshipName: row.fellowshipName,
    meetingCount: row.meetingCount,
    avgAttendees: row.meetingCount > 0
      ? Math.round(Number(row.totalAttendees) / row.meetingCount)
      : 0,
  }));
}

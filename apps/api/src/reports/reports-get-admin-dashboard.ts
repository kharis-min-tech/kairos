// @kairos/api - Reports Get Admin Dashboard Lambda (Task 21.1)
// Admin-only dashboard returning church-wide metrics:
//   - totalActiveMembers, totalBranches, totalDepartments, totalFellowships
//   - donationsLast30Days (sum of completed donations)
//   - soulsCapturedLast30Days (count of new souls)
//   - attendanceLast4Weeks (weekly breakdown: weekStart, presentCount, totalCount)
//   - attendanceTrendLast8Weeks (line chart data for last 8 weeks)
//   - recentActivity (last 10 actions across members, donations, souls)
//
// Only admins can access this endpoint.
//
// **Requirements: 26.1-26.7**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  resolveAuthContext,
  handleError,
  successResponse,
  createLogger,
  getDb,
  isAdmin,
  ForbiddenError,
} from '@kairos/utils';
import {
  members,
  donations,
  souls,
  services,
  serviceAttendance,
  branches,
  departments,
  fellowships,
} from '@kairos/database';
import { eq, and, sql, gte, desc } from 'drizzle-orm';

const logger = createLogger('reports-get-admin-dashboard');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Generating admin dashboard', { userId: ctx.memberId });

    // 2. Only admins can access
    if (!isAdmin(ctx)) {
      throw new ForbiddenError('Only administrators can access the admin dashboard');
    }

    const db = getDb();

    // 3. Total active members
    const [memberCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(members)
      .where(eq(members.isActive, true));

    // 4. Total active branches
    const [branchCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(branches)
      .where(eq(branches.isActive, true));

    // 5. Total departments
    const [departmentCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(departments);

    // 6. Total fellowships
    const [fellowshipCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(fellowships);

    // 7. Donations in last 30 days (completed only)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [donationTotal] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
      .from(donations)
      .where(
        and(
          eq(donations.status, 'completed'),
          gte(donations.donationDate, thirtyDaysAgo.toISOString().split('T')[0] as string)
        )
      );

    // 8. Souls captured in last 30 days
    const [soulsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(souls)
      .where(gte(souls.createdAt, thirtyDaysAgo));

    // 9. Attendance last 4 weeks (grouped by week)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const attendanceData = await db
      .select({
        weekStart: sql<string>`date_trunc('week', ${services.serviceDate})::date`.as('week_start'),
        presentCount: sql<number>`count(CASE WHEN ${serviceAttendance.attendanceStatus} = 'Present' THEN 1 END)::int`.as('present_count'),
        totalCount: sql<number>`count(${serviceAttendance.memberId})::int`.as('total_count'),
      })
      .from(services)
      .innerJoin(serviceAttendance, eq(services.serviceId, serviceAttendance.serviceId))
      .where(gte(services.serviceDate, fourWeeksAgo))
      .groupBy(sql`date_trunc('week', ${services.serviceDate})`)
      .orderBy(sql`date_trunc('week', ${services.serviceDate})`);

    // 10. Attendance trend chart data (last 8 weeks) — Req 26.6
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const attendanceTrend = await db
      .select({
        weekStart: sql<string>`date_trunc('week', ${services.serviceDate})::date`.as('week_start'),
        presentCount: sql<number>`count(CASE WHEN ${serviceAttendance.attendanceStatus} = 'Present' THEN 1 END)::int`.as('present_count'),
        totalCount: sql<number>`count(${serviceAttendance.memberId})::int`.as('total_count'),
      })
      .from(services)
      .innerJoin(serviceAttendance, eq(services.serviceId, serviceAttendance.serviceId))
      .where(gte(services.serviceDate, eightWeeksAgo))
      .groupBy(sql`date_trunc('week', ${services.serviceDate})`)
      .orderBy(sql`date_trunc('week', ${services.serviceDate})`);

    // 11. Recent activity feed (last 10 actions) — Req 26.7
    // Combine recent members, donations, and souls into a unified feed
    const recentMembers = await db
      .select({
        type: sql<string>`'member_registered'`.as('type'),
        description: sql<string>`${members.firstName} || ' ' || ${members.lastName} || ' registered'`.as('description'),
        timestamp: members.createdAt,
      })
      .from(members)
      .orderBy(desc(members.createdAt))
      .limit(10);

    const recentDonations = await db
      .select({
        type: sql<string>`'donation_received'`.as('type'),
        description: sql<string>`'Donation of £' || ${donations.amount} || ' (' || ${donations.donationPurpose} || ') received'`.as('description'),
        timestamp: donations.createdAt,
      })
      .from(donations)
      .where(eq(donations.status, 'completed'))
      .orderBy(desc(donations.createdAt))
      .limit(10);

    const recentSouls = await db
      .select({
        type: sql<string>`'soul_captured'`.as('type'),
        description: sql<string>`${souls.firstName} || ' ' || ${souls.lastName} || ' captured'`.as('description'),
        timestamp: souls.createdAt,
      })
      .from(souls)
      .orderBy(desc(souls.createdAt))
      .limit(10);

    // Merge and sort by timestamp, take top 10
    const allActivity = [
      ...recentMembers.map((r) => ({ type: r.type, description: r.description, timestamp: r.timestamp })),
      ...recentDonations.map((r) => ({ type: r.type, description: r.description, timestamp: r.timestamp })),
      ...recentSouls.map((r) => ({ type: r.type, description: r.description, timestamp: r.timestamp })),
    ]
      .sort((a, b) => {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 10);

    logger.info('Admin dashboard generated', {
      totalActiveMembers: memberCount?.count ?? 0,
      totalBranches: branchCount?.count ?? 0,
    });

    // Calculate overall attendance percentage from last 4 weeks
    const totalPresent = attendanceData.reduce((sum, row) => sum + (row.presentCount ?? 0), 0);
    const totalAttendees = attendanceData.reduce((sum, row) => sum + (row.totalCount ?? 0), 0);
    const attendancePercentage = totalAttendees > 0 ? Math.round((totalPresent / totalAttendees) * 100) : 0;

    return successResponse({
      totalMembers: memberCount?.count ?? 0,
      totalBranches: branchCount?.count ?? 0,
      totalDepartments: departmentCount?.count ?? 0,
      totalFellowships: fellowshipCount?.count ?? 0,
      donationsLast30Days: parseFloat(donationTotal?.total ?? '0'),
      soulsLast30Days: soulsCount?.count ?? 0,
      attendancePercentage,
      attendanceTrends: attendanceTrend.map((row) => ({
        week: row.weekStart,
        percentage: row.totalCount ? Math.round(((row.presentCount ?? 0) / row.totalCount) * 100) : 0,
      })),
      recentActivity: allActivity.map((a) => ({
        action: a.description,
        timestamp: a.timestamp ? new Date(a.timestamp).toISOString() : '',
        actor: a.type,
      })),
    });
  } catch (error) {
    return handleError(error, { operation: 'reports-get-admin-dashboard' });
  }
};

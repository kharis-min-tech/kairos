// @kairos/api - Reports Get Pastor Dashboard Lambda (Task 21.2)
// Pastor dashboard returning branch-scoped metrics:
//   - branchMemberCount: active members in pastor's branch
//   - branchDonationsLast30Days: completed donations for the branch
//   - branchSoulsCapturedLast30Days: souls captured for the branch
//   - branchAttendanceLast4Weeks: weekly attendance for the branch
//   - overdueFollowUps: souls with status 'New'/'Following Up' not contacted in 3+ days
//
// Pastors and admins can access. Pastors see only their branch data.
// Admins can pass ?branchId= to view any branch.
//
// **Requirements: 21.2**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  resolveAuthContext,
  handleError,
  successResponse,
  createLogger,
  getDb,
  isAdmin,
  isPastor,
  ForbiddenError,
} from '@kairos/utils';
import {
  members,
  donations,
  souls,
  services,
  serviceAttendance,
  outreachPrograms,
} from '@kairos/database';
import { eq, and, sql, gte, lte } from 'drizzle-orm';

const logger = createLogger('reports-get-pastor-dashboard');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Generating pastor dashboard', { userId: ctx.memberId, branchId: ctx.branchId });

    // 2. Only pastors and admins can access
    if (!isAdmin(ctx) && !isPastor(ctx)) {
      throw new ForbiddenError('Only pastors and administrators can access the pastor dashboard');
    }

    // 3. Determine effective branch
    const params = event.queryStringParameters || {};
    const requestedBranchId = params.branchId ? parseInt(params.branchId, 10) : ctx.branchId;

    // 4. Enforce branch isolation for non-admins
    if (!isAdmin(ctx) && requestedBranchId !== ctx.branchId) {
      throw new ForbiddenError('You can only view your own branch dashboard');
    }

    const branchId = requestedBranchId;
    const db = getDb();

    // 5. Branch member count
    const [memberCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(members)
      .where(and(eq(members.homeBranchId, branchId), eq(members.isActive, true)));

    // 6. Branch donations last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [donationTotal] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
      .from(donations)
      .where(
        and(
          eq(donations.branchId, branchId),
          eq(donations.status, 'completed'),
          gte(donations.donationDate, thirtyDaysAgo.toISOString().split('T')[0] as string)
        )
      );

    // 7. Branch souls captured last 30 days
    const [soulsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(souls)
      .innerJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.outreachId))
      .where(
        and(
          eq(outreachPrograms.branchId, branchId),
          gte(souls.createdAt, thirtyDaysAgo)
        )
      );

    // 8. Branch attendance last 4 weeks
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
      .where(and(eq(services.branchId, branchId), gte(services.serviceDate, fourWeeksAgo)))
      .groupBy(sql`date_trunc('week', ${services.serviceDate})`)
      .orderBy(sql`date_trunc('week', ${services.serviceDate})`);

    // 9. Overdue follow-ups: souls with status 'New' or 'Following Up' not contacted in 3+ days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const [overdueCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(souls)
      .innerJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.outreachId))
      .where(
        and(
          eq(outreachPrograms.branchId, branchId),
          sql`${souls.status} IN ('New', 'Following Up')`,
          lte(souls.updatedAt, threeDaysAgo)
        )
      );

    logger.info('Pastor dashboard generated', {
      branchId,
      branchMemberCount: memberCount?.count ?? 0,
    });

    return successResponse({
      branchId,
      branchMemberCount: memberCount?.count ?? 0,
      branchDonationsLast30Days: donationTotal?.total ?? '0',
      branchSoulsCapturedLast30Days: soulsCount?.count ?? 0,
      branchAttendanceLast4Weeks: attendanceData.map((row) => ({
        weekStart: row.weekStart,
        presentCount: row.presentCount ?? 0,
        totalCount: row.totalCount ?? 0,
      })),
      overdueFollowUps: overdueCount?.count ?? 0,
    });
  } catch (error) {
    return handleError(error, { operation: 'reports-get-pastor-dashboard' });
  }
};

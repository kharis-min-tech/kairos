// @kairos/api - Reports Get Attendance Trends Lambda (Task 21.5)
// Returns line chart data for weekly attendance trends.
// Groups by week using date_trunc, counts by attendance status.
// Defaults to last 8 weeks if no date range provided.
// Enforces branch isolation for pastors.
//
// **Requirements: 29.1, 29.4**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { services, serviceAttendance } from '@kairos/database';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import {
  resolveAuthContext,
  isAdmin,
  handleError,
  successResponse,
  createLogger,
  getDb,
  ForbiddenError,
} from '@kairos/utils';

const logger = createLogger('reports-get-attendance-trends');

const DEFAULT_WEEKS = 8;

/**
 * Lambda handler for attendance trends report.
 *
 * Query parameters:
 * - branchId (admin only — pastors auto-scoped)
 * - dateFrom / dateTo (optional date range, YYYY-MM-DD)
 *
 * Returns weekly data points with present, absent, virtual, and total counts.
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Getting attendance trends', { userId: ctx.memberId, branchId: ctx.branchId });

    // 2. Parse query parameters
    const params = event.queryStringParameters || {};
    const branchId = params.branchId ? parseInt(params.branchId, 10) : ctx.branchId;

    // 3. Branch isolation: non-admins see only their branch
    if (!isAdmin(ctx)) {
      if (branchId !== ctx.branchId) {
        throw new ForbiddenError('Access denied to this branch');
      }
    }

    const db = getDb();

    // 4. Default to last 8 weeks if no date range provided
    const dateTo = params.dateTo
      ? new Date(params.dateTo)
      : new Date();
    const dateFrom = params.dateFrom
      ? new Date(params.dateFrom)
      : new Date(dateTo.getTime() - DEFAULT_WEEKS * 7 * 24 * 60 * 60 * 1000);

    // 5. Build WHERE conditions
    const conditions = [
      eq(services.branchId, branchId),
      gte(services.serviceDate, dateFrom),
      lte(services.serviceDate, dateTo),
    ];

    const whereClause = and(...conditions);

    // 6. Query weekly aggregates grouped by week
    const data = await db
      .select({
        weekStart: sql<string>`date_trunc('week', ${services.serviceDate})::date`.as('week_start'),
        presentCount: sql<number>`count(*) FILTER (WHERE ${serviceAttendance.attendanceStatus} = 'Present')::int`.as('present_count'),
        absentCount: sql<number>`count(*) FILTER (WHERE ${serviceAttendance.attendanceStatus} = 'Absent')::int`.as('absent_count'),
        virtualCount: sql<number>`count(*) FILTER (WHERE ${serviceAttendance.attendanceStatus} = 'Virtual')::int`.as('virtual_count'),
        totalCount: sql<number>`count(*)::int`.as('total_count'),
      })
      .from(serviceAttendance)
      .innerJoin(services, eq(serviceAttendance.serviceId, services.serviceId))
      .where(whereClause)
      .groupBy(sql`date_trunc('week', ${services.serviceDate})`)
      .orderBy(sql`date_trunc('week', ${services.serviceDate})`);

    logger.info('Attendance trends retrieved', {
      branchId,
      weeks: data.length,
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
    });

    return successResponse({
      branchId,
      dateFrom: dateFrom.toISOString().split('T')[0],
      dateTo: dateTo.toISOString().split('T')[0],
      data,
    });
  } catch (error) {
    return handleError(error);
  }
};

// @kairos/api - Attendance Get Trends Lambda
// Returns line chart data for last 8 weeks of service attendance.
// Calculates attendance percentage per service: (present / total members).
// Enforces branch isolation for pastors.
//
// **Requirements: 12.1-12.4**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and, gte, lte, sql, asc } from 'drizzle-orm';
import { services, members } from '@kairos/database';
import {
  resolveAuthContext,
  isAdmin,
  handleError,
  successResponse,
  createLogger,
  getDb,
  ForbiddenError,
} from '@kairos/utils';

const logger = createLogger('attendance-get-trends');

const WEEKS = 8;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.info('Getting attendance trends', { userId: ctx.memberId, branchId: ctx.branchId });

    const params = event.queryStringParameters || {};
    const branchId = params.branchId ? parseInt(params.branchId, 10) : ctx.branchId;

    // Branch isolation
    if (!isAdmin(ctx)) {
      if (branchId !== ctx.branchId) {
        throw new ForbiddenError('Access denied to this branch');
      }
    }

    const db = getDb();

    // Calculate date range (last 8 weeks)
    const dateTo = params.dateTo ? new Date(params.dateTo) : new Date();
    const dateFrom = params.dateFrom
      ? new Date(params.dateFrom)
      : new Date(dateTo.getTime() - WEEKS * 7 * 24 * 60 * 60 * 1000);

    // Get total active members in branch (for percentage calculation)
    const [memberCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(members)
      .where(
        and(
          eq(members.homeBranchId, branchId),
          eq(members.isActive, true)
        )
      );

    const totalMembers = memberCount?.count ?? 0;

    // Get services with attendance counts in date range
    const trendData = await db
      .select({
        serviceId: services.serviceId,
        serviceDate: services.serviceDate,
        serviceType: services.serviceType,
        serviceTitle: services.serviceTitle,
        presentCount: sql<number>`(
          SELECT COUNT(*)::int FROM service_attendance sa
          WHERE sa.service_id = ${services.serviceId}
          AND sa.attendance_status = 'Present'
        )`.as('present_count'),
        virtualCount: sql<number>`(
          SELECT COUNT(*)::int FROM service_attendance sa
          WHERE sa.service_id = ${services.serviceId}
          AND sa.attendance_status = 'Virtual'
        )`.as('virtual_count'),
        totalRecorded: sql<number>`(
          SELECT COUNT(*)::int FROM service_attendance sa
          WHERE sa.service_id = ${services.serviceId}
        )`.as('total_recorded'),
      })
      .from(services)
      .where(
        and(
          eq(services.branchId, branchId),
          gte(services.serviceDate, dateFrom),
          lte(services.serviceDate, dateTo)
        )
      )
      .orderBy(asc(services.serviceDate));

    const trends = trendData.map(s => ({
      serviceId: s.serviceId,
      serviceDate: s.serviceDate,
      serviceType: s.serviceType,
      serviceTitle: s.serviceTitle,
      presentCount: s.presentCount ?? 0,
      virtualCount: s.virtualCount ?? 0,
      totalRecorded: s.totalRecorded ?? 0,
      totalMembers,
      attendancePercentage: totalMembers > 0
        ? Math.round(((s.presentCount ?? 0) / totalMembers) * 100)
        : 0,
    }));

    logger.info('Attendance trends retrieved', { branchId, services: trends.length });

    return successResponse({
      branchId,
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
      totalMembers,
      trends,
    });
  } catch (error) {
    return handleError(error);
  }
};

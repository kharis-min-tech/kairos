// @kairos/api - Attendance List Service Lambda
// Lists service attendance with filters: branch, date range, service type.
// Enforces branch-level authorization.
//
// **Requirements: 10.7**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { services } from '@kairos/database';
import {
  resolveAuthContext,
  isAdmin,
  handleError,
  successResponse,
  createLogger,
  getDb,
} from '@kairos/utils';

const logger = createLogger('attendance-list-service');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.info('Listing service attendance', { userId: ctx.memberId, branchId: ctx.branchId });

    const params = event.queryStringParameters || {};
    const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || '50', 10) || 50));
    const offset = (page - 1) * limit;
    const branchId = params.branchId ? parseInt(params.branchId, 10) : ctx.branchId;
    const serviceType = params.serviceType;
    const dateFrom = params.dateFrom;
    const dateTo = params.dateTo;

    const db = getDb();

    // Build WHERE conditions for services
    const conditions = [];

    // Branch isolation
    if (!isAdmin(ctx)) {
      conditions.push(eq(services.branchId, ctx.branchId));
    } else {
      conditions.push(eq(services.branchId, branchId));
    }

    if (serviceType) {
      conditions.push(eq(services.serviceType, serviceType));
    }

    if (dateFrom) {
      conditions.push(gte(services.serviceDate, new Date(dateFrom)));
    }

    if (dateTo) {
      conditions.push(lte(services.serviceDate, new Date(dateTo)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get services with attendance counts
    const data = await db
      .select({
        serviceId: services.serviceId,
        branchId: services.branchId,
        serviceDate: services.serviceDate,
        serviceType: services.serviceType,
        serviceTitle: services.serviceTitle,
        topic: services.topic,
        expectedAttendance: services.expectedAttendance,
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
        absentCount: sql<number>`(
          SELECT COUNT(*)::int FROM service_attendance sa
          WHERE sa.service_id = ${services.serviceId}
          AND sa.attendance_status = 'Absent'
        )`.as('absent_count'),
        totalRecords: sql<number>`(
          SELECT COUNT(*)::int FROM service_attendance sa
          WHERE sa.service_id = ${services.serviceId}
        )`.as('total_records'),
      })
      .from(services)
      .where(whereClause)
      .orderBy(desc(services.serviceDate))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(services)
      .where(whereClause);

    const total = countResult?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    logger.info('Service attendance listed', { total, page });

    return successResponse({
      data,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    return handleError(error);
  }
};

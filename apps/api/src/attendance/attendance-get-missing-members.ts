// @kairos/api - Attendance Get Missing Members Lambda
// Identifies members who missed last 4 consecutive services.
// Returns member list with last attendance date.
//
// **Requirements: 12.5**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and, sql, desc } from 'drizzle-orm';
import { services, members } from '@kairos/database';
import {
  resolveAuthContext,
  isAdmin,
  enforceBranchAccess,
  handleError,
  successResponse,
  createLogger,
  getDb,
} from '@kairos/utils';

const logger = createLogger('attendance-get-missing-members');

const CONSECUTIVE_THRESHOLD = 4;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.info('Getting missing members', { userId: ctx.memberId, branchId: ctx.branchId });

    const params = event.queryStringParameters || {};
    const branchId = params.branchId ? parseInt(params.branchId, 10) : ctx.branchId;
    const threshold = params.threshold ? parseInt(params.threshold, 10) : CONSECUTIVE_THRESHOLD;

    // Branch isolation
    if (!isAdmin(ctx)) {
      enforceBranchAccess(ctx, branchId);
    }

    const db = getDb();

    // Get the last N services for this branch (ordered by date desc)
    const recentServices = await db
      .select({ serviceId: services.serviceId, serviceDate: services.serviceDate })
      .from(services)
      .where(eq(services.branchId, branchId))
      .orderBy(desc(services.serviceDate))
      .limit(threshold);

    if (recentServices.length < threshold) {
      // Not enough services to determine consecutive absences
      return successResponse({
        branchId,
        threshold,
        missingMembers: [],
        message: `Fewer than ${threshold} services recorded for this branch`,
      });
    }

    const recentServiceIds = recentServices.map(s => s.serviceId);

    // Find active members in this branch who were NOT present in any of the last N services
    const missingMembers = await db
      .select({
        memberId: members.memberId,
        firstName: members.firstName,
        lastName: members.lastName,
        email: members.email,
        phone: members.phone,
        lastAttendanceDate: sql<string>`(
          SELECT MAX(s.service_date)::text
          FROM service_attendance sa
          INNER JOIN services s ON s.service_id = sa.service_id
          WHERE sa.member_id = ${members.memberId}
          AND sa.attendance_status = 'Present'
          AND s.branch_id = ${branchId}
        )`.as('last_attendance_date'),
      })
      .from(members)
      .where(
        and(
          eq(members.homeBranchId, branchId),
          eq(members.isActive, true),
          sql`${members.memberId} NOT IN (
            SELECT DISTINCT sa.member_id
            FROM service_attendance sa
            WHERE sa.service_id IN (${sql.join(recentServiceIds.map(id => sql`${id}`), sql`, `)})
            AND sa.attendance_status IN ('Present', 'Virtual')
          )`
        )
      );

    logger.info('Missing members retrieved', { branchId, count: missingMembers.length });

    return successResponse({
      branchId,
      threshold,
      recentServices: recentServices.map(s => ({
        serviceId: s.serviceId,
        serviceDate: s.serviceDate,
      })),
      missingMembers,
    });
  } catch (error) {
    return handleError(error);
  }
};

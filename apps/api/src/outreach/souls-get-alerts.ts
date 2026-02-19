// @kairos/api - Souls Get Alerts Lambda
// Queries souls not followed up within threshold (default 2-3 days).
// Returns souls past threshold with assigned worker info.
//
// **Requirements: 15.4, 15.5**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and, lte, sql } from 'drizzle-orm';
import { souls, members, outreachPrograms } from '@kairos/database';
import {
  resolveAuthContext,
  isAdmin,
  enforceBranchAccess,
  handleError,
  successResponse,
  createLogger,
  getDb,
} from '@kairos/utils';

const logger = createLogger('souls-get-alerts');

const DEFAULT_THRESHOLD_DAYS = 3;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.info('Getting soul follow-up alerts', { userId: ctx.memberId, branchId: ctx.branchId });

    const params = event.queryStringParameters || {};
    const thresholdDays = params.thresholdDays
      ? parseInt(params.thresholdDays, 10)
      : DEFAULT_THRESHOLD_DAYS;
    const branchId = params.branchId ? parseInt(params.branchId, 10) : ctx.branchId;

    if (!isAdmin(ctx)) {
      enforceBranchAccess(ctx, branchId);
    }

    const db = getDb();

    // Find souls that are in active statuses and haven't been followed up within threshold
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

    const overduesouls = await db
      .select({
        soulId: souls.soulId,
        firstName: souls.firstName,
        lastName: souls.lastName,
        phone: souls.phone,
        status: souls.status,
        assignedMemberId: souls.assignedMemberId,
        assignedFirstName: members.firstName,
        assignedLastName: members.lastName,
        assignedEmail: members.email,
        lastUpdated: souls.updatedAt,
        programName: outreachPrograms.programName,
        daysSinceUpdate: sql<number>`EXTRACT(DAY FROM NOW() - ${souls.updatedAt})::int`.as('days_since_update'),
      })
      .from(souls)
      .innerJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.outreachId))
      .leftJoin(members, eq(souls.assignedMemberId, members.memberId))
      .where(
        and(
          eq(outreachPrograms.branchId, branchId),
          sql`${souls.status} IN ('New', 'Following Up', 'Interested')`,
          lte(souls.updatedAt, thresholdDate)
        )
      );

    logger.info('Follow-up alerts retrieved', { count: overduesouls.length, thresholdDays });

    return successResponse({
      branchId,
      thresholdDays,
      overdueSouls: overduesouls.map(s => ({
        soulId: s.soulId,
        firstName: s.firstName,
        lastName: s.lastName,
        phone: s.phone,
        status: s.status,
        lastUpdated: s.lastUpdated,
        daysSinceUpdate: s.daysSinceUpdate,
        programName: s.programName,
        assignedWorker: s.assignedFirstName
          ? {
              memberId: s.assignedMemberId,
              firstName: s.assignedFirstName,
              lastName: s.assignedLastName,
              email: s.assignedEmail,
            }
          : null,
      })),
    });
  } catch (error) {
    return handleError(error);
  }
};

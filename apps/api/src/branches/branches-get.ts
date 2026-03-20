// @kairos/api - Get Branch Lambda
// GET /v1/branches/{branchId}
// Returns branch details with current pastor, elders, and member count.

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and, sql } from 'drizzle-orm';
import {
  resolveAuthContext,
  enforceBranchAccess,
  handleError,
  successResponse,
  NotFoundError,
  createLogger,
  getDb,
} from '@kairos/utils';
import { branches, regions, branchLeadership, members } from '@kairos/database';

const logger = createLogger('branches-get');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);

    // 2. Parse branch ID from path
    const branchId = parseInt(
      event.pathParameters?.branchId || event.pathParameters?.id || '0',
      10
    );
    if (!branchId || isNaN(branchId)) {
      throw new NotFoundError('Branch');
    }

    logger.info('Getting branch', { branchId, memberId: ctx.memberId });

    // 3. Enforce branch access
    enforceBranchAccess(ctx, branchId);

    // 4. Query branch details
    const db = getDb();

    const [branchResult] = await db
      .select({
        branchId: branches.branchId,
        branchName: branches.branchName,
        regionId: branches.regionId,
        regionName: regions.regionName,
        branchType: branches.branchType,
        address: branches.address,
        city: branches.city,
        postalCode: branches.postalCode,
        phone: branches.phone,
        email: branches.email,
        establishedDate: branches.establishedDate,
        isActive: branches.isActive,
        createdAt: branches.createdAt,
        updatedAt: branches.updatedAt,
      })
      .from(branches)
      .leftJoin(regions, eq(branches.regionId, regions.regionId))
      .where(eq(branches.branchId, branchId))
      .limit(1);

    if (!branchResult) {
      throw new NotFoundError('Branch', String(branchId));
    }

    // 5. Get current pastor (role='Main Pastor', is_current=TRUE)
    const currentPastor = await db
      .select({
        leadershipId: branchLeadership.leadershipId,
        memberId: branchLeadership.memberId,
        firstName: members.firstName,
        lastName: members.lastName,
        startDate: branchLeadership.startDate,
      })
      .from(branchLeadership)
      .innerJoin(members, eq(branchLeadership.memberId, members.memberId))
      .where(
        and(
          eq(branchLeadership.branchId, branchId),
          eq(branchLeadership.role, 'Main Pastor'),
          eq(branchLeadership.isCurrent, true)
        )
      )
      .limit(1);

    // 6. Get current elders
    const currentElders = await db
      .select({
        leadershipId: branchLeadership.leadershipId,
        memberId: branchLeadership.memberId,
        firstName: members.firstName,
        lastName: members.lastName,
        startDate: branchLeadership.startDate,
      })
      .from(branchLeadership)
      .innerJoin(members, eq(branchLeadership.memberId, members.memberId))
      .where(
        and(
          eq(branchLeadership.branchId, branchId),
          eq(branchLeadership.role, 'Elder'),
          eq(branchLeadership.isCurrent, true)
        )
      );

    // 7. Get member count
    const [memberCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(members)
      .where(
        and(
          eq(members.homeBranchId, branchId),
          eq(members.isActive, true)
        )
      );

    const response = {
      ...branchResult,
      currentPastor: currentPastor[0] || null,
      elders: currentElders,
      memberCount: memberCountResult?.count ?? 0,
    };

    logger.info('Branch retrieved', { branchId });

    return successResponse(response);
  } catch (error) {
    return handleError(error, { operation: 'branches-get' });
  }
};

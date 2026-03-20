// @kairos/api - Members Delete Lambda
// Soft delete: sets is_active=FALSE
// Preserves all historical data (donations, attendance, etc.)

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq } from 'drizzle-orm';
import { members } from '@kairos/database';
import {
  resolveAuthContext,
  isAdmin,
  isPastor,
  handleError,
  successResponse,
  createLogger,
  getDb,
  NotFoundError,
  ForbiddenError,
} from '@kairos/utils';

const logger = createLogger('members-delete');

/**
 * Lambda handler for soft-deleting a member.
 * Sets is_active=FALSE to preserve historical data.
 *
 * Path parameter: memberId
 *
 * Access control:
 * - Admin: can deactivate any member
 * - Pastor: can deactivate members in their branch
 * - Member/Leader: cannot deactivate members
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    const targetMemberId = parseInt(event.pathParameters?.memberId || '', 10);

    if (isNaN(targetMemberId)) {
      throw new NotFoundError('Member', event.pathParameters?.memberId);
    }

    logger.info('Soft-deleting member', { userId: ctx.memberId, targetMemberId });

    // 2. Only admins and pastors can deactivate members
    if (!isAdmin(ctx) && !isPastor(ctx)) {
      throw new ForbiddenError('Only administrators and pastors can deactivate members');
    }

    const db = getDb();

    // 3. Fetch existing member
    const [existing] = await db
      .select()
      .from(members)
      .where(eq(members.memberId, targetMemberId))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Member', String(targetMemberId));
    }

    // 4. Enforce branch isolation for pastors
    if (isPastor(ctx) && !isAdmin(ctx)) {
      if (existing.homeBranchId !== ctx.branchId) {
        throw new ForbiddenError('You can only deactivate members in your branch');
      }
    }

    // 5. Soft delete — set is_active=FALSE
    const [deactivated] = await db
      .update(members)
      .set({ isActive: false })
      .where(eq(members.memberId, targetMemberId))
      .returning();

    logger.info('Member soft-deleted successfully', {
      memberId: targetMemberId,
      branchId: existing.homeBranchId,
    });

    return successResponse({
      message: 'Member deactivated successfully',
      member: deactivated,
    });
  } catch (error) {
    return handleError(error, { operation: 'members-delete' });
  }
};

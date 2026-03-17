// @kairos/api - Fellowship Remove Member Lambda
// Soft-removes a member from a fellowship by setting is_active = false.

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  resolveAuthContext,
  enforceBranchAccess,
  handleError,
  successResponse,
  createLogger,
  getDb,
  NotFoundError,
  BadRequestError,
} from '@kairos/utils';
import { fellowships, fellowshipMembers } from '@kairos/database';
import { eq, and } from 'drizzle-orm';

const logger = createLogger('fellowships-remove-member');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.setContext({ userId: ctx.memberId, branchId: ctx.branchId });

    // 2. Extract path parameters
    const fellowshipId = parseInt(
      event.pathParameters?.fellowshipId || '',
      10
    );
    const memberId = parseInt(event.pathParameters?.memberId || '', 10);

    if (isNaN(fellowshipId)) {
      throw new BadRequestError('Invalid fellowship ID');
    }
    if (isNaN(memberId)) {
      throw new BadRequestError('Invalid member ID');
    }

    logger.info('Removing member from fellowship', { fellowshipId, memberId });

    const db = getDb();

    // 3. Verify fellowship exists
    const [fellowship] = await db
      .select({
        fellowshipId: fellowships.fellowshipId,
        branchId: fellowships.branchId,
      })
      .from(fellowships)
      .where(eq(fellowships.fellowshipId, fellowshipId))
      .limit(1);

    if (!fellowship) {
      throw new NotFoundError('Fellowship', String(fellowshipId));
    }

    // 4. Enforce branch isolation
    enforceBranchAccess(ctx, fellowship.branchId);

    // 5. Find active membership record
    const [membership] = await db
      .select()
      .from(fellowshipMembers)
      .where(
        and(
          eq(fellowshipMembers.fellowshipId, fellowshipId),
          eq(fellowshipMembers.memberId, memberId),
          eq(fellowshipMembers.isActive, true)
        )
      )
      .limit(1);

    if (!membership) {
      throw new NotFoundError(
        'Active membership',
        `fellowship ${fellowshipId}, member ${memberId}`
      );
    }

    // 6. Soft-remove: set is_active = false and record leave date
    const [updated] = await db
      .update(fellowshipMembers)
      .set({
        isActive: false,
        leaveDate: new Date().toISOString().split('T')[0],
      })
      .where(
        eq(
          fellowshipMembers.fellowshipMemberId,
          membership.fellowshipMemberId
        )
      )
      .returning();

    logger.info('Member removed from fellowship', {
      fellowshipId,
      memberId,
      fellowshipMemberId: membership.fellowshipMemberId,
    });

    return successResponse(updated);
  } catch (error) {
    return handleError(error);
  }
};

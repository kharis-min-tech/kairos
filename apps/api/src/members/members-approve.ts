// @kairos/api - Members Approve Lambda
// Changes member from pending (is_active=false) to active (is_active=true)
// Sends welcome email via SES (stubbed for now — just logs)
// Restricted to branch admins only (Admin role or Pastor of that branch)

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
  BadRequestError,
} from '@kairos/utils';

const logger = createLogger('members-approve');

/**
 * Lambda handler for approving a pending member.
 * Changes is_active from false to true.
 *
 * Path parameter: memberId
 *
 * Access control:
 * - Admin: can approve any member
 * - Pastor: can approve members in their branch only
 * - Leader/Member: cannot approve members
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    const targetMemberId = event.pathParameters?.memberId || '';

    if (!targetMemberId) {
      throw new NotFoundError('Member', event.pathParameters?.memberId);
    }

    logger.info('Approving member', { userId: ctx.memberId, targetMemberId });

    // 2. Only admins and pastors can approve members
    if (!isAdmin(ctx) && !isPastor(ctx)) {
      throw new ForbiddenError('Only administrators and pastors can approve members');
    }

    const db = getDb();

    // 3. Fetch existing member
    const [existing] = await db
      .select()
      .from(members)
      .where(eq(members.id, targetMemberId))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Member', String(targetMemberId));
    }

    // 4. Enforce branch isolation for pastors
    if (isPastor(ctx) && !isAdmin(ctx)) {
      if (existing.homeBranchId !== ctx.branchId) {
        throw new ForbiddenError('You can only approve members in your branch');
      }
    }

    // 5. Verify member is currently pending (is_active=false)
    if (existing.isActive) {
      throw new BadRequestError('Member is already active');
    }

    // 6. Approve — set is_active=TRUE
    const [approved] = await db
      .update(members)
      .set({ isActive: true })
      .where(eq(members.id, targetMemberId))
      .returning();

    // 7. Send welcome email via SES (stubbed for now)
    // TODO: Integrate with SES when email templates are ready
    logger.info('Welcome email would be sent', {
      memberId: targetMemberId,
      email: existing.email,
      branchId: existing.homeBranchId,
    });

    logger.info('Member approved successfully', {
      memberId: targetMemberId,
      branchId: existing.homeBranchId,
    });

    return successResponse({
      message: 'Member approved successfully',
      member: approved,
    });
  } catch (error) {
    return handleError(error, { operation: 'members-approve' });
  }
};

// @kairos/api - Delete Branch Lambda
// DELETE /v1/branches/{branchId}
// Soft delete (is_active=FALSE).
// Prevents deletion if active members are assigned to the branch.

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and, sql } from 'drizzle-orm';
import {
  resolveAuthContext,
  isAdmin,
  handleError,
  successResponse,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  createLogger,
  getDb,
} from '@kairos/utils';
import { branches, members } from '@kairos/database';

const logger = createLogger('branches-delete');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);

    // 2. Only admins can delete branches
    if (!isAdmin(ctx)) {
      throw new ForbiddenError('Only admins can delete branches');
    }

    // 3. Parse branch ID from path
    const branchId = parseInt(
      event.pathParameters?.branchId || event.pathParameters?.id || '0',
      10
    );
    if (!branchId || isNaN(branchId)) {
      throw new NotFoundError('Branch');
    }

    logger.info('Deleting branch', { branchId, memberId: ctx.memberId });

    const db = getDb();

    // 4. Verify branch exists
    const [branch] = await db
      .select({ branchId: branches.branchId, isActive: branches.isActive })
      .from(branches)
      .where(eq(branches.branchId, branchId))
      .limit(1);

    if (!branch) {
      throw new NotFoundError('Branch', String(branchId));
    }

    if (!branch.isActive) {
      throw new BadRequestError('Branch is already inactive');
    }

    // 5. Check for active members assigned to this branch
    const [memberCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(members)
      .where(
        and(
          eq(members.homeBranchId, branchId),
          eq(members.isActive, true)
        )
      );

    if (memberCount && memberCount.count > 0) {
      throw new BadRequestError(
        `Cannot delete branch: ${memberCount.count} active member(s) are assigned to this branch. Reassign or deactivate them first.`
      );
    }

    // 6. Soft delete: set is_active=FALSE
    const [updated] = await db
      .update(branches)
      .set({ isActive: false })
      .where(eq(branches.branchId, branchId))
      .returning();

    logger.info('Branch soft-deleted', { branchId });

    return successResponse({
      message: 'Branch deactivated successfully',
      branch: updated,
    });
  } catch (error) {
    return handleError(error, { operation: 'branches-delete' });
  }
};

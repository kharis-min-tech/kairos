// @kairos/api - Outreach Override Branch Lambda
// Allows admins to temporarily change a member's home_branch_id
// for cross-branch outreach participation.
// Stores original home_branch_id so it can be restored.
// Restricted to admins only.
//
// **Requirements: 13.7**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  resolveAuthContext,
  isAdmin,
  handleError,
  successResponse,
  createLogger,
  getDb,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '@kairos/utils';
import { members } from '@kairos/database';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

const logger = createLogger('outreach-override-branch');

const overrideSchema = z.object({
  member_id: z.number().int().positive(),
  target_branch_id: z.number().int().positive(),
  restore: z.boolean().default(false),
  original_branch_id: z.number().int().positive().optional(),
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);

    if (!isAdmin(ctx)) {
      throw new ForbiddenError('Only admins can override branch assignments');
    }

    logger.info('Overriding branch for outreach', { userId: ctx.memberId });

    const body = JSON.parse(event.body || '{}');
    const input = overrideSchema.parse(body);

    const db = getDb();

    // Verify member exists
    const [member] = await db
      .select({
        memberId: members.memberId,
        homeBranchId: members.homeBranchId,
      })
      .from(members)
      .where(eq(members.memberId, input.member_id))
      .limit(1);

    if (!member) {
      throw new NotFoundError('Member', String(input.member_id));
    }

    if (input.restore) {
      // Restore original branch
      if (!input.original_branch_id) {
        throw new BadRequestError('original_branch_id is required when restoring');
      }

      const [updated] = await db
        .update(members)
        .set({
          homeBranchId: input.original_branch_id,
          updatedAt: sql`NOW()`,
        })
        .where(eq(members.memberId, input.member_id))
        .returning();

      logger.info('Branch restored', {
        memberId: input.member_id,
        restoredTo: input.original_branch_id,
      });

      return successResponse({
        ...updated,
        message: 'Branch assignment restored',
      });
    }

    // Override to target branch
    const originalBranchId = member.homeBranchId;

    const [updated] = await db
      .update(members)
      .set({
        homeBranchId: input.target_branch_id,
        updatedAt: sql`NOW()`,
      })
      .where(eq(members.memberId, input.member_id))
      .returning();

    logger.info('Branch overridden', {
      memberId: input.member_id,
      from: originalBranchId,
      to: input.target_branch_id,
    });

    return successResponse({
      ...updated,
      originalBranchId,
      message: 'Branch temporarily overridden for outreach',
    });
  } catch (error) {
    return handleError(error);
  }
};

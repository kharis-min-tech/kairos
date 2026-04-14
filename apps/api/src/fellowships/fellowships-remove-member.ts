// @kairos/api - Fellowship Remove Member Lambda
// Removes a member from a fellowship by setting is_active=false and setting leave_date.

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import {
  resolveAuthContext,
  enforceBranchAccess,
  validateOrThrow,
  handleError,
  successResponse,
  createLogger,
  getDb,
  NotFoundError,
} from '@kairos/utils';
import { fellowships, fellowshipMembers } from '@kairos/database';
import { eq, and, sql } from 'drizzle-orm';

const logger = createLogger('fellowships-remove-member');

const removeMemberSchema = z.object({
  fellowship_id: z.string().uuid(),
  member_id: z.string().uuid(),
  notes: z.string().trim().max(500).optional(),
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.setContext({ userId: ctx.memberId, branchId: ctx.branchId });

    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(removeMemberSchema, body);

    const db = getDb();

    // Verify fellowship exists
    const [fellowship] = await db
      .select({ branchId: fellowships.branchId })
      .from(fellowships)
      .where(eq(fellowships.id, input.fellowship_id))
      .limit(1);

    if (!fellowship) {
      throw new NotFoundError('Fellowship', String(input.fellowship_id));
    }

    enforceBranchAccess(ctx, fellowship.branchId);

    // Find active membership
    const [membership] = await db
      .select()
      .from(fellowshipMembers)
      .where(
        and(
          eq(fellowshipMembers.fellowshipId, input.fellowship_id),
          eq(fellowshipMembers.memberId, input.member_id),
          eq(fellowshipMembers.isActive, true)
        )
      )
      .limit(1);

    if (!membership) {
      throw new NotFoundError(
        'Fellowship membership',
        `fellowship_id=${input.fellowship_id}, member_id=${input.member_id}`
      );
    }

    // Soft delete: set is_active=false and leave_date
    const [updated] = await db
      .update(fellowshipMembers)
      .set({
        isActive: false,
        leaveDate: sql`CURRENT_DATE`,
        notes: input.notes || membership.notes,
        updatedAt: new Date(),
      })
      .where(eq(fellowshipMembers.id, membership.id))
      .returning();

    logger.info('Member removed from fellowship', {
      fellowshipId: input.fellowship_id,
      memberId: input.member_id,
    });

    return successResponse(updated!);
  } catch (error) {
    return handleError(error);
  }
};

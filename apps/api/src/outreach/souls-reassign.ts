// @kairos/api - Souls Reassign Lambda
// Allows reassigning a soul to a different worker.
//
// **Requirements: 14.5**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  resolveAuthContext,
  enforceBranchAccess,
  validateOrThrow,
  soulReassignSchema,
  handleError,
  successResponse,
  createLogger,
  getDb,
  NotFoundError,
  isAdmin,
} from '@kairos/utils';
import { souls, members, outreachPrograms } from '@kairos/database';
import { eq, sql } from 'drizzle-orm';

const logger = createLogger('souls-reassign');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    const soulId = parseInt(event.pathParameters?.soulId || '', 10);

    if (isNaN(soulId)) {
      throw new NotFoundError('Soul');
    }

    logger.info('Reassigning soul', { soulId, userId: ctx.memberId });

    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(soulReassignSchema, body);

    const db = getDb();

    // Verify soul exists
    const [soul] = await db
      .select({
        soulId: souls.soulId,
        branchId: outreachPrograms.branchId,
      })
      .from(souls)
      .innerJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.outreachId))
      .where(eq(souls.soulId, soulId))
      .limit(1);

    if (!soul) {
      throw new NotFoundError('Soul', String(soulId));
    }

    if (!isAdmin(ctx)) {
      enforceBranchAccess(ctx, soul.branchId);
    }

    // Verify new assigned member exists
    const [member] = await db
      .select({ memberId: members.memberId })
      .from(members)
      .where(eq(members.memberId, input.assigned_member_id))
      .limit(1);

    if (!member) {
      throw new NotFoundError('Member', String(input.assigned_member_id));
    }

    // Update assignment
    const [updated] = await db
      .update(souls)
      .set({
        assignedMemberId: input.assigned_member_id,
        updatedAt: sql`NOW()`,
      })
      .where(eq(souls.soulId, soulId))
      .returning();

    logger.info('Soul reassigned', { soulId, newAssignedMemberId: input.assigned_member_id });

    return successResponse(updated);
  } catch (error) {
    return handleError(error);
  }
};

// @kairos/api - Fellowship Add Member Lambda
// Adds a member to a fellowship, enforcing the single fellowship membership constraint.
// A member can belong to only ONE fellowship at a time.

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import {
  resolveAuthContext,
  enforceBranchAccess,
  validateOrThrow,
  handleError,
  createdResponse,
  createLogger,
  getDb,
  ConflictError,
  NotFoundError,
} from '@kairos/utils';
import { fellowships, fellowshipMembers } from '@kairos/database';
import { eq, and } from 'drizzle-orm';

const logger = createLogger('fellowships-add-member');

/** Inline schema for add-member request */
const addMemberSchema = z.object({
  fellowship_id: z.number().int().positive(),
  member_id: z.number().int().positive(),
  notes: z.string().trim().max(500).optional(),
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.setContext({ userId: ctx.memberId, branchId: ctx.branchId });
    logger.info('Adding member to fellowship');

    // 2. Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(addMemberSchema, body);

    const db = getDb();

    // 3. Verify fellowship exists and is active
    const [fellowship] = await db
      .select({
        fellowshipId: fellowships.fellowshipId,
        branchId: fellowships.branchId,
        isActive: fellowships.isActive,
      })
      .from(fellowships)
      .where(eq(fellowships.fellowshipId, input.fellowship_id))
      .limit(1);

    if (!fellowship) {
      throw new NotFoundError('Fellowship', String(input.fellowship_id));
    }

    // 4. Enforce branch isolation
    enforceBranchAccess(ctx, fellowship.branchId);

    // 5. CRITICAL: Check if member is already in another active fellowship
    const existingMembership = await db
      .select({
        fellowshipMemberId: fellowshipMembers.fellowshipMemberId,
        fellowshipId: fellowshipMembers.fellowshipId,
      })
      .from(fellowshipMembers)
      .where(
        and(
          eq(fellowshipMembers.memberId, input.member_id),
          eq(fellowshipMembers.isActive, true)
        )
      )
      .limit(1);

    if (existingMembership.length > 0) {
      throw new ConflictError(
        'Member already belongs to a fellowship. A member can belong to only ONE fellowship at a time.',
        [
          {
            field: 'member_id',
            message: `Member is already active in fellowship ${existingMembership[0]!.fellowshipId}`,
          },
        ]
      );
    }

    // 6. Create fellowship_members record
    const [created] = await db
      .insert(fellowshipMembers)
      .values({
        fellowshipId: input.fellowship_id,
        memberId: input.member_id,
        notes: input.notes,
      })
      .returning();

    logger.info('Member added to fellowship', {
      fellowshipId: input.fellowship_id,
      memberId: input.member_id,
      fellowshipMemberId: created!.fellowshipMemberId,
    });

    return createdResponse(created!);
  } catch (error) {
    return handleError(error);
  }
};

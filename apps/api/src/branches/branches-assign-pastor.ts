// @kairos/api - Assign Pastor to Branch Lambda
// POST /v1/branches/{branchId}/pastor
// Marks existing current main pastor as is_current=FALSE, sets end_date.
// Assigns new pastor with is_current=TRUE.
// Enforces: only one current main pastor per branch (DB has unique partial index).
// Uses a transaction for atomicity.

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import {
  resolveAuthContext,
  isAdmin,
  validateOrThrow,
  handleError,
  createdResponse,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  createLogger,
  getDb,
} from '@kairos/utils';
import { branches, branchLeadership, members } from '@kairos/database';

const logger = createLogger('branches-assign-pastor');

/** Schema for assigning a pastor */
const assignPastorSchema = z.object({
  member_id: z.string().uuid(),
  start_date: z.coerce.date().optional(),
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);

    // 2. Only admins can assign pastors
    if (!isAdmin(ctx)) {
      throw new ForbiddenError('Only admins can assign pastors');
    }

    // 3. Parse branch ID from path
    const branchId = event.pathParameters?.branchId ?? event.pathParameters?.id ?? '';
    if (!branchId) {
      throw new NotFoundError('Branch');
    }

    // 4. Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(assignPastorSchema, body);

    logger.info('Assigning pastor to branch', {
      branchId,
      memberId: input.member_id,
      requestedBy: ctx.memberId,
    });

    const db = getDb();

    // 5. Verify branch exists and is active
    const [branch] = await db
      .select({ branchId: branches.id, isActive: branches.isActive })
      .from(branches)
      .where(eq(branches.id, branchId))
      .limit(1);

    if (!branch) {
      throw new NotFoundError('Branch', String(branchId));
    }
    if (!branch.isActive) {
      throw new BadRequestError('Cannot assign pastor to an inactive branch');
    }

    // 6. Verify member exists and is active
    const [member] = await db
      .select({ memberId: members.id, isActive: members.isActive })
      .from(members)
      .where(eq(members.id, input.member_id))
      .limit(1);

    if (!member) {
      throw new NotFoundError('Member', String(input.member_id));
    }
    if (!member.isActive) {
      throw new BadRequestError('Cannot assign an inactive member as pastor');
    }

    const startDate = input.start_date
      ? input.start_date.toISOString().split('T')[0]!
      : new Date().toISOString().split('T')[0]!;

    // 7. Use transaction: mark existing pastor as not current, then assign new one
    const result = await db.transaction(async (tx) => {
      // Mark existing current main pastor as not current
      await tx
        .update(branchLeadership)
        .set({
          isCurrent: false,
          endDate: startDate,
        })
        .where(
          and(
            eq(branchLeadership.branchId, branchId),
            eq(branchLeadership.role, 'Main Pastor'),
            eq(branchLeadership.isCurrent, true)
          )
        );

      // Assign new pastor
      const [newAssignment] = await tx
        .insert(branchLeadership)
        .values({
          branchId,
          memberId: input.member_id,
          role: 'Main Pastor',
          startDate,
          isCurrent: true,
        })
        .returning();

      return newAssignment;
    });

    logger.info('Pastor assigned', {
      branchId,
      memberId: input.member_id,
      leadershipId: result!.id,
    });

    return createdResponse(result);
  } catch (error) {
    return handleError(error, { operation: 'branches-assign-pastor' });
  }
};

// @kairos/api - Assign Elder to Branch Lambda
// POST /v1/branches/{branchId}/elder
// Allows multiple elders per branch.
// Adds elder to branch_leadership with role='Elder', is_current=TRUE.

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq } from 'drizzle-orm';
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

const logger = createLogger('branches-assign-elder');

/** Schema for assigning an elder */
const assignElderSchema = z.object({
  member_id: z.number().int().positive('member_id must be a positive integer'),
  start_date: z.coerce.date().optional(),
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);

    // 2. Only admins can assign elders
    if (!isAdmin(ctx)) {
      throw new ForbiddenError('Only admins can assign elders');
    }

    // 3. Parse branch ID from path
    const branchId = parseInt(
      event.pathParameters?.branchId || event.pathParameters?.id || '0',
      10
    );
    if (!branchId || isNaN(branchId)) {
      throw new NotFoundError('Branch');
    }

    // 4. Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(assignElderSchema, body);

    logger.info('Assigning elder to branch', {
      branchId,
      memberId: input.member_id,
      requestedBy: ctx.memberId,
    });

    const db = getDb();

    // 5. Verify branch exists and is active
    const [branch] = await db
      .select({ branchId: branches.branchId, isActive: branches.isActive })
      .from(branches)
      .where(eq(branches.branchId, branchId))
      .limit(1);

    if (!branch) {
      throw new NotFoundError('Branch', String(branchId));
    }
    if (!branch.isActive) {
      throw new BadRequestError('Cannot assign elder to an inactive branch');
    }

    // 6. Verify member exists and is active
    const [member] = await db
      .select({ memberId: members.memberId, isActive: members.isActive })
      .from(members)
      .where(eq(members.memberId, input.member_id))
      .limit(1);

    if (!member) {
      throw new NotFoundError('Member', String(input.member_id));
    }
    if (!member.isActive) {
      throw new BadRequestError('Cannot assign an inactive member as elder');
    }

    const startDate = input.start_date
      ? input.start_date.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    // 7. Insert elder assignment (multiple elders allowed per branch)
    const [assignment] = await db
      .insert(branchLeadership)
      .values({
        branchId,
        memberId: input.member_id,
        role: 'Elder',
        startDate: startDate!,
        isCurrent: true,
      })
      .returning();

    logger.info('Elder assigned', {
      branchId,
      memberId: input.member_id,
      leadershipId: assignment!.leadershipId,
    });

    return createdResponse(assignment);
  } catch (error) {
    return handleError(error, { operation: 'branches-assign-elder' });
  }
};

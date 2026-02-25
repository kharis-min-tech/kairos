// @kairos/api - Souls Update Status Lambda
// Validates status transitions: New → Following Up → Interested → Converted / Not Interested
// When Converted: require converted_to_member_id, record conversion_date.
//
// **Requirements: 16.1-16.4, 16.6**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  resolveAuthContext,
  enforceBranchAccess,
  validateOrThrow,
  soulStatusUpdateSchema,
  handleError,
  successResponse,
  createLogger,
  getDb,
  NotFoundError,
  BadRequestError,
  isAdmin,
} from '@kairos/utils';
import { souls, outreachPrograms, members } from '@kairos/database';
import { eq, sql } from 'drizzle-orm';

const logger = createLogger('souls-update-status');

/** Valid status transitions */
const VALID_TRANSITIONS: Record<string, string[]> = {
  'New': ['Following Up'],
  'Following Up': ['Interested', 'Not Interested'],
  'Interested': ['Converted', 'Not Interested'],
  'Converted': [],
  'Not Interested': [],
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    const soulId = parseInt(event.pathParameters?.soulId || '', 10);

    if (isNaN(soulId)) {
      throw new NotFoundError('Soul');
    }

    logger.info('Updating soul status', { soulId, userId: ctx.memberId });

    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(soulStatusUpdateSchema, body);

    const db = getDb();

    // Get current soul status — use leftJoin to support ad-hoc souls (null outreach_id)
    const [soul] = await db
      .select({
        soulId: souls.soulId,
        status: souls.status,
        outreachBranchId: outreachPrograms.branchId,
        assignedMemberId: souls.assignedMemberId,
      })
      .from(souls)
      .leftJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.outreachId))
      .where(eq(souls.soulId, soulId))
      .limit(1);

    if (!soul) {
      throw new NotFoundError('Soul', String(soulId));
    }

    // Derive branch: from outreach program, or from assigned member for ad-hoc souls
    let branchId = soul.outreachBranchId;
    if (!branchId && soul.assignedMemberId) {
      const [assignedMember] = await db
        .select({ homeBranchId: members.homeBranchId })
        .from(members)
        .where(eq(members.memberId, soul.assignedMemberId))
        .limit(1);
      branchId = assignedMember?.homeBranchId ?? null;
    }

    if (!isAdmin(ctx) && branchId) {
      enforceBranchAccess(ctx, branchId);
    }

    // Validate status transition
    const currentStatus = soul.status || 'New';
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(input.status)) {
      throw new BadRequestError(
        `Invalid status transition: '${currentStatus}' → '${input.status}'. Allowed: ${allowedTransitions.join(', ') || 'none (terminal state)'}`
      );
    }

    // Build update values
    const updateValues: Record<string, unknown> = {
      status: input.status,
      updatedAt: sql`NOW()`,
    };

    if (input.status === 'Converted') {
      updateValues.convertedToMemberId = input.converted_to_member_id;
    }

    // Update soul status
    const [updated] = await db
      .update(souls)
      .set(updateValues)
      .where(eq(souls.soulId, soulId))
      .returning();

    logger.info('Soul status updated', {
      soulId,
      from: currentStatus,
      to: input.status,
    });

    return successResponse(updated);
  } catch (error) {
    return handleError(error);
  }
};

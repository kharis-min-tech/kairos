// @kairos/api - Souls Log Follow-up Lambda
// Logs a follow-up contact for a soul.
// Updates soul's last follow-up date (updatedAt).
//
// **Requirements: 15.1-15.3, 15.7**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  resolveAuthContext,
  enforceBranchAccess,
  validateOrThrow,
  followUpCreateSchema,
  handleError,
  createdResponse,
  createLogger,
  getDb,
  NotFoundError,
  isAdmin,
} from '@kairos/utils';
import { souls, followUps, outreachPrograms, members } from '@kairos/database';
import { eq, sql } from 'drizzle-orm';

const logger = createLogger('souls-log-followup');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.info('Logging follow-up', { userId: ctx.memberId, branchId: ctx.branchId });

    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(followUpCreateSchema, body);

    const db = getDb();

    // Verify soul exists and get branch (use leftJoin to support ad-hoc souls)
    const [soul] = await db
      .select({
        soulId: souls.soulId,
        outreachId: souls.outreachId,
        branchId: outreachPrograms.branchId,
        assignedMemberId: souls.assignedMemberId,
      })
      .from(souls)
      .leftJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.outreachId))
      .where(eq(souls.soulId, input.soul_id))
      .limit(1);

    if (!soul) {
      throw new NotFoundError('Soul', String(input.soul_id));
    }

    // Derive branch: from outreach program, or from assigned member for ad-hoc souls
    let branchId = soul.branchId;
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

    // Insert follow-up record
    const [created] = await db
      .insert(followUps)
      .values({
        soulId: input.soul_id,
        memberId: ctx.memberId,
        followUpDate: input.contact_date,
        contactMethod: input.contact_method,
        contactStatus: input.contact_status,
        durationMinutes: input.duration_minutes,
        notes: input.notes,
      })
      .returning();

    // Update soul's updatedAt (acts as last_follow_up_date)
    await db
      .update(souls)
      .set({ updatedAt: sql`NOW()` })
      .where(eq(souls.soulId, input.soul_id));

    logger.info('Follow-up logged', { followUpId: created!.followUpId, soulId: input.soul_id });

    return createdResponse(created!);
  } catch (error) {
    return handleError(error);
  }
};

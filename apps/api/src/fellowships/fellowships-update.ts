// @kairos/api - Fellowship Update Lambda
// Updates fellowship details including name, description, leaders, and meeting schedule.

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
  BadRequestError,
  ConflictError,
} from '@kairos/utils';
import { fellowships, fellowshipMembers } from '@kairos/database';
import { eq, and } from 'drizzle-orm';

const logger = createLogger('fellowships-update');

const updateSchema = z.object({
  fellowship_name: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  leader_id: z.string().uuid().optional().nullable(),
  co_leader_id: z.string().uuid().optional().nullable(),
  meeting_schedule: z.string().trim().max(200).optional().nullable(),
  is_active: z.boolean().optional(),
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.setContext({ userId: ctx.memberId, branchId: ctx.branchId });

    const fellowshipId = event.pathParameters?.fellowshipId || '';
    if (!fellowshipId) {
      throw new BadRequestError('Invalid fellowship ID');
    }

    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(updateSchema, body);

    // Validate leader != co-leader if both provided
    if (
      input.leader_id &&
      input.co_leader_id &&
      input.leader_id === input.co_leader_id
    ) {
      throw new BadRequestError('Leader and co-leader must be different members');
    }

    const db = getDb();

    // Fetch existing fellowship
    const [existing] = await db
      .select()
      .from(fellowships)
      .where(eq(fellowships.id, fellowshipId))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Fellowship', String(fellowshipId));
    }

    enforceBranchAccess(ctx, existing.branchId);

    // Check for duplicate name if changing name
    if (input.fellowship_name && input.fellowship_name !== existing.fellowshipName) {
      const [duplicate] = await db
        .select({ fellowshipId: fellowships.id })
        .from(fellowships)
        .where(
          and(
            eq(fellowships.fellowshipName, input.fellowship_name),
            eq(fellowships.branchId, existing.branchId)
          )
        )
        .limit(1);

      if (duplicate) {
        throw new ConflictError(
          `Fellowship '${input.fellowship_name}' already exists in this branch`
        );
      }
    }

    // Update fellowship
    const [updated] = await db
      .update(fellowships)
      .set({
        ...(input.fellowship_name && { fellowshipName: input.fellowship_name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.leader_id !== undefined && { leaderId: input.leader_id }),
        ...(input.co_leader_id !== undefined && { coLeaderId: input.co_leader_id }),
        ...(input.meeting_schedule !== undefined && { meetingSchedule: input.meeting_schedule }),
        ...(input.is_active !== undefined && { isActive: input.is_active }),
        updatedAt: new Date(),
      })
      .where(eq(fellowships.id, fellowshipId))
      .returning();

    // Auto-add new leader to fellowship_members if changed
    if (input.leader_id && input.leader_id !== existing.leaderId) {
      const [existingMembership] = await db
        .select()
        .from(fellowshipMembers)
        .where(
          and(
            eq(fellowshipMembers.fellowshipId, fellowshipId),
            eq(fellowshipMembers.memberId, input.leader_id),
            eq(fellowshipMembers.isActive, true)
          )
        )
        .limit(1);

      if (!existingMembership) {
        await db.insert(fellowshipMembers).values({
          fellowshipId,
          memberId: input.leader_id,
          notes: 'Auto-added as fellowship leader',
        });
      }
    }

    // Auto-add new co-leader to fellowship_members if changed
    if (input.co_leader_id && input.co_leader_id !== existing.coLeaderId) {
      const [existingMembership] = await db
        .select()
        .from(fellowshipMembers)
        .where(
          and(
            eq(fellowshipMembers.fellowshipId, fellowshipId),
            eq(fellowshipMembers.memberId, input.co_leader_id),
            eq(fellowshipMembers.isActive, true)
          )
        )
        .limit(1);

      if (!existingMembership) {
        await db.insert(fellowshipMembers).values({
          fellowshipId,
          memberId: input.co_leader_id,
          notes: 'Auto-added as fellowship co-leader',
        });
      }
    }

    logger.info('Fellowship updated', { fellowshipId });

    return successResponse(updated!);
  } catch (error) {
    return handleError(error);
  }
};

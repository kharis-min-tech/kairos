// @kairos/api - Fellowship Create Meeting Lambda
// Creates a new fellowship meeting record.

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
  NotFoundError,
  ConflictError,
} from '@kairos/utils';
import { fellowships, fellowshipMeetings } from '@kairos/database';
import { eq, and } from 'drizzle-orm';

const logger = createLogger('fellowships-create-meeting');

const createMeetingSchema = z.object({
  fellowship_id: z.number().int().positive(),
  meeting_date: z.string().datetime(),
  meeting_title: z.string().trim().max(200).optional(),
  meeting_topic: z.string().trim().max(200).optional(),
  meeting_notes: z.string().trim().max(5000).optional(),
  location: z.string().trim().max(200).optional(),
  duration_minutes: z.number().int().positive().optional(),
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.setContext({ userId: ctx.memberId, branchId: ctx.branchId });

    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(createMeetingSchema, body);

    const db = getDb();

    // Verify fellowship exists
    const [fellowship] = await db
      .select({ branchId: fellowships.branchId })
      .from(fellowships)
      .where(
        and(
          eq(fellowships.fellowshipId, input.fellowship_id),
          eq(fellowships.isActive, true)
        )
      )
      .limit(1);

    if (!fellowship) {
      throw new NotFoundError('Fellowship', String(input.fellowship_id));
    }

    enforceBranchAccess(ctx, fellowship.branchId);

    // Check for duplicate meeting on same date
    const [existing] = await db
      .select({ meetingId: fellowshipMeetings.meetingId })
      .from(fellowshipMeetings)
      .where(
        and(
          eq(fellowshipMeetings.fellowshipId, input.fellowship_id),
          eq(fellowshipMeetings.meetingDate, new Date(input.meeting_date))
        )
      )
      .limit(1);

    if (existing) {
      throw new ConflictError(
        'A meeting already exists for this fellowship on this date'
      );
    }

    // Create meeting
    const [created] = await db
      .insert(fellowshipMeetings)
      .values({
        fellowshipId: input.fellowship_id,
        meetingDate: new Date(input.meeting_date),
        meetingTitle: input.meeting_title,
        meetingTopic: input.meeting_topic,
        meetingNotes: input.meeting_notes,
        location: input.location,
        durationMinutes: input.duration_minutes,
        createdBy: ctx.memberId,
      })
      .returning();

    logger.info('Fellowship meeting created', {
      meetingId: created!.meetingId,
      fellowshipId: input.fellowship_id,
    });

    return createdResponse(created!);
  } catch (error) {
    return handleError(error);
  }
};

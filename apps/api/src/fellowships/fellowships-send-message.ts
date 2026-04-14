// @kairos/api - Fellowship Send Message Lambda
// Broadcasts a message to all fellowship members or a subset.
// Restricted to fellowship leader or co-leader only.
// For MVP: creates a notification record targeting the fellowship.

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
  ForbiddenError,
  BadRequestError,
} from '@kairos/utils';
import {
  fellowships,
  fellowshipMembers,
  notifications,
  notificationRecipients,
} from '@kairos/database';
import { eq, and, inArray } from 'drizzle-orm';

const logger = createLogger('fellowships-send-message');

/** Inline schema for send-message request */
const sendMessageSchema = z.object({
  fellowship_id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
  priority: z.enum(['Low', 'Normal', 'High', 'Urgent']).default('Normal'),
  /** Optional: send to specific member IDs only. If omitted, sends to all. */
  member_ids: z.array(z.string().uuid()).optional(),
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.setContext({ userId: ctx.memberId, branchId: ctx.branchId });
    logger.info('Sending fellowship message');

    // 2. Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(sendMessageSchema, body);

    const db = getDb();

    // 3. Verify fellowship exists
    const [fellowship] = await db
      .select({
        fellowshipId: fellowships.id,
        fellowshipName: fellowships.fellowshipName,
        branchId: fellowships.branchId,
        leaderId: fellowships.leaderId,
        coLeaderId: fellowships.coLeaderId,
      })
      .from(fellowships)
      .where(
        and(
          eq(fellowships.id, input.fellowship_id),
          eq(fellowships.isActive, true)
        )
      )
      .limit(1);

    if (!fellowship) {
      throw new NotFoundError('Fellowship', String(input.fellowship_id));
    }

    // 4. Enforce branch isolation
    enforceBranchAccess(ctx, fellowship.branchId);

    // 5. Verify the requesting user is the leader or co-leader
    const isLeaderOrCoLeader =
      ctx.memberId === fellowship.leaderId ||
      ctx.memberId === fellowship.coLeaderId;

    if (!isLeaderOrCoLeader) {
      throw new ForbiddenError(
        'Only the fellowship leader or co-leader can send messages'
      );
    }

    // 6. Get target member IDs
    let targetMemberIds: string[];

    if (input.member_ids && input.member_ids.length > 0) {
      // Send to specific subset — verify they are active fellowship members
      const activeMembers = await db
        .select({ memberId: fellowshipMembers.memberId })
        .from(fellowshipMembers)
        .where(
          and(
            eq(fellowshipMembers.fellowshipId, input.fellowship_id),
            eq(fellowshipMembers.isActive, true),
            inArray(fellowshipMembers.memberId, input.member_ids)
          )
        );

      targetMemberIds = activeMembers.map((m) => m.memberId);

      if (targetMemberIds.length === 0) {
        throw new BadRequestError(
          'None of the specified members are active in this fellowship'
        );
      }
    } else {
      // Send to all active fellowship members
      const allMembers = await db
        .select({ memberId: fellowshipMembers.memberId })
        .from(fellowshipMembers)
        .where(
          and(
            eq(fellowshipMembers.fellowshipId, input.fellowship_id),
            eq(fellowshipMembers.isActive, true)
          )
        );

      targetMemberIds = allMembers.map((m) => m.memberId);
    }

    // 7. Create notification record
    const [notification] = await db
      .insert(notifications)
      .values({
        title: input.title,
        message: input.message,
        notificationType: 'Announcement',
        priority: input.priority,
        targetScope: 'Fellowship',
        targetFellowshipId: input.fellowship_id,
        sentBy: ctx.memberId,
      })
      .returning();

    // 8. Create notification_recipients for each target member
    if (targetMemberIds.length > 0) {
      await db.insert(notificationRecipients).values(
        targetMemberIds.map((memberId) => ({
          notificationId: notification!.notificationId,
          memberId,
        }))
      );
    }

    logger.info('Fellowship message sent', {
      fellowshipId: input.fellowship_id,
      notificationId: notification!.notificationId,
      recipientCount: targetMemberIds.length,
    });

    return createdResponse({
      notificationId: notification!.notificationId,
      fellowshipId: input.fellowship_id,
      title: input.title,
      recipientCount: targetMemberIds.length,
    });
  } catch (error) {
    return handleError(error);
  }
};

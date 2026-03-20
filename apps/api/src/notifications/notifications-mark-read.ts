// @kairos/api - Notifications Mark Read Lambda (Task 19.3)
// Marks notifications as read for the current user.
// Supports marking a single notification or all unread notifications.
// Updates isRead=true and readAt=NOW() on notificationRecipients.
// Returns 200 with count of updated records.
//
// **Requirements: 22.10-22.11**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { notificationRecipients } from '@kairos/database';
import { eq, and, sql } from 'drizzle-orm';
import {
  resolveAuthContext,
  handleError,
  successResponse,
  createLogger,
  getDb,
  BadRequestError,
} from '@kairos/utils';

const logger = createLogger('notifications-mark-read');

/**
 * Lambda handler for marking notifications as read.
 *
 * Body:
 * - notification_id?: number — mark a single notification as read
 * - mark_all?: boolean — mark all unread notifications as read
 *
 * At least one of notification_id or mark_all must be provided.
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Marking notifications as read', { userId: ctx.memberId });

    // 2. Parse body
    const body = JSON.parse(event.body || '{}');
    const notificationId: number | undefined = body.notification_id;
    const markAll: boolean = body.mark_all === true;

    if (!markAll && !notificationId) {
      throw new BadRequestError(
        'Either notification_id or mark_all must be provided'
      );
    }

    const db = getDb();
    let updatedCount = 0;

    if (markAll) {
      // 3. Mark all unread notifications as read for this member
      const result = await db
        .update(notificationRecipients)
        .set({
          isRead: true,
          readAt: sql`NOW()`,
        })
        .where(
          and(
            eq(notificationRecipients.memberId, ctx.memberId),
            eq(notificationRecipients.isRead, false)
          )
        )
        .returning();

      updatedCount = result.length;

      logger.info('All notifications marked as read', {
        userId: ctx.memberId,
        updatedCount,
      });
    } else if (notificationId) {
      // 4. Mark single notification as read for this member
      const result = await db
        .update(notificationRecipients)
        .set({
          isRead: true,
          readAt: sql`NOW()`,
        })
        .where(
          and(
            eq(notificationRecipients.memberId, ctx.memberId),
            eq(notificationRecipients.notificationId, notificationId)
          )
        )
        .returning();

      updatedCount = result.length;

      logger.info('Notification marked as read', {
        userId: ctx.memberId,
        notificationId,
        updatedCount,
      });
    }

    // 5. Return success with count
    return successResponse({
      updatedCount,
      message: markAll
        ? `Marked ${updatedCount} notification(s) as read`
        : updatedCount > 0
          ? 'Notification marked as read'
          : 'Notification not found or already read',
    });
  } catch (error) {
    return handleError(error, { operation: 'notifications-mark-read' });
  }
};

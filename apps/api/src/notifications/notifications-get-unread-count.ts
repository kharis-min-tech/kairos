// @kairos/api - Notifications Get Unread Count Lambda (Task 19.5)
// Returns the count of unread, non-dismissed, non-expired notifications for the authenticated user.
// Display caps at "99+" for UI badge rendering.
//
// **Requirements: 24.1-24.6**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  resolveAuthContext,
  handleError,
  successResponse,
  createLogger,
  getDb,
} from '@kairos/utils';
import { notifications, notificationRecipients } from '@kairos/database';
import { eq, and, sql } from 'drizzle-orm';

const logger = createLogger('notifications-get-unread-count');

/**
 * Lambda handler for getting unread notification count.
 *
 * Flow:
 * 1. Extract auth context from authorizer
 * 2. Count unread, non-dismissed, non-expired notification recipients for the user
 * 3. Return { count, display } where display caps at "99+"
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Getting unread notification count', {
      userId: ctx.memberId,
    });

    const db = getDb();

    // 2. Count unread, non-dismissed, non-expired notifications
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notificationRecipients)
      .innerJoin(
        notifications,
        eq(notificationRecipients.notificationId, notifications.notificationId)
      )
      .where(
        and(
          eq(notificationRecipients.memberId, ctx.memberId),
          eq(notificationRecipients.isRead, false),
          eq(notificationRecipients.isDismissed, false),
          eq(notifications.isActive, true),
          sql`(${notifications.expiresAt} IS NULL OR ${notifications.expiresAt} > NOW())`
        )
      );

    const count = result?.count ?? 0;

    // 3. Return count with display capping at "99+"
    const display = count > 99 ? '99+' : String(count);

    return successResponse({ count, display });
  } catch (error) {
    return handleError(error, { operation: 'notifications-get-unread-count' });
  }
};

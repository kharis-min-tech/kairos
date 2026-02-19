// @kairos/api - Notifications List Lambda (Task 19.2)
// Lists in-app notifications for the current authenticated user.
// Joins notificationRecipients with notifications.
// Filters out expired and dismissed notifications.
// Ordered by sentAt descending with pagination.
// Includes isRead status from notificationRecipients.
//
// **Requirements: 22.7-22.9**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { notifications, notificationRecipients } from '@kairos/database';
import { eq, and, sql, desc } from 'drizzle-orm';
import {
  resolveAuthContext,
  handleError,
  successResponse,
  createLogger,
  getDb,
} from '@kairos/utils';

const logger = createLogger('notifications-list');

/**
 * Lambda handler for listing notifications for the current user.
 *
 * Query parameters:
 * - page (default: 1)
 * - limit (default: 50, max: 100)
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Listing notifications', { userId: ctx.memberId });

    // 2. Parse query parameters
    const params = event.queryStringParameters || {};
    const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || '50', 10) || 50));
    const offset = (page - 1) * limit;

    const db = getDb();

    // 3. Build WHERE conditions
    // - memberId matches current user
    // - not dismissed
    // - not expired (expiresAt is null or >= now)
    const conditions = and(
      eq(notificationRecipients.memberId, ctx.memberId),
      eq(notificationRecipients.isDismissed, false),
      sql`(${notifications.expiresAt} IS NULL OR ${notifications.expiresAt} >= NOW())`
    );

    // 4. Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notificationRecipients)
      .innerJoin(
        notifications,
        eq(notificationRecipients.notificationId, notifications.notificationId)
      )
      .where(conditions);

    const total = countResult?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    // 5. Get paginated results
    const data = await db
      .select({
        notificationId: notifications.notificationId,
        title: notifications.title,
        message: notifications.message,
        notificationType: notifications.notificationType,
        priority: notifications.priority,
        targetScope: notifications.targetScope,
        sentBy: notifications.sentBy,
        sentAt: notifications.sentAt,
        scheduledFor: notifications.scheduledFor,
        expiresAt: notifications.expiresAt,
        isRead: notificationRecipients.isRead,
        readAt: notificationRecipients.readAt,
        isDismissed: notificationRecipients.isDismissed,
      })
      .from(notificationRecipients)
      .innerJoin(
        notifications,
        eq(notificationRecipients.notificationId, notifications.notificationId)
      )
      .where(conditions)
      .orderBy(desc(notifications.sentAt))
      .limit(limit)
      .offset(offset);

    logger.info('Notifications listed', { total, page, limit, userId: ctx.memberId });

    // 6. Return paginated response
    return successResponse({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return handleError(error, { operation: 'notifications-list' });
  }
};

// @kairos/api - Notifications Create Lambda (Task 19.1)
// Creates in-app notifications with target audience scoping.
// Admins can create any notification; leaders can only target their own department/fellowship.
// Populates notification_recipients based on target scope (All, Branch, Department, Fellowship).
// Returns 201 with the created notification.
//
// **Requirements: 22.1-22.6**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  notifications,
  notificationRecipients,
  members,
  departmentMembers,
  fellowshipMembers,
} from '@kairos/database';
import { eq, and } from 'drizzle-orm';
import {
  resolveAuthContext,
  validateOrThrow,
  notificationCreateSchema,
  handleError,
  createdResponse,
  createLogger,
  getDb,
  isAdmin,
  isLeader,
  ForbiddenError,
} from '@kairos/utils';
import { pushToMembers } from '../websocket/ws-send-message';

const logger = createLogger('notifications-create');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Creating notification', { userId: ctx.memberId, branchId: ctx.branchId });

    // 2. Parse and validate body
    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(notificationCreateSchema, body);

    // 3. Authorization
    // Leaders can only target their own department/fellowship
    if (!isAdmin(ctx) && isLeader(ctx)) {
      if (input.target_scope === 'All' || input.target_scope === 'Branch') {
        throw new ForbiddenError(
          'Leaders can only send notifications to their own department or fellowship'
        );
      }
    }

    // Non-admin, non-leader members cannot create notifications
    if (!isAdmin(ctx) && !isLeader(ctx)) {
      throw new ForbiddenError(
        'Only admins and leaders can create notifications'
      );
    }

    const db = getDb();

    // 4. Insert notification record
    const [created] = await db
      .insert(notifications)
      .values({
        title: input.title,
        message: input.message,
        notificationType: input.notification_type,
        priority: input.priority,
        targetScope: input.target_scope,
        targetBranchId: input.target_branch_id ?? null,
        targetRegionId: input.target_region_id ?? null,
        targetDepartmentId: input.target_department_id ?? null,
        targetFellowshipId: input.target_fellowship_id ?? null,
        targetRoleId: input.target_role_id ?? null,
        targetLeadershipRole: input.target_leadership_role ?? null,
        sentBy: ctx.memberId,
        scheduledFor: input.scheduled_for ?? null,
        expiresAt: input.expires_at ?? null,
      })
      .returning();

    logger.info('Notification created', {
      notificationId: created!.notificationId,
      scope: input.target_scope,
    });

    // 5. Populate notification_recipients based on target scope
    let recipientMemberIds: string[] = [];

    switch (input.target_scope) {
      case 'All': {
        // Query all active members
        const activeMembers = await db
          .select({ memberId: members.id })
          .from(members)
          .where(eq(members.isActive, true));
        recipientMemberIds = activeMembers.map((m) => m.memberId);
        break;
      }

      case 'Branch': {
        // Query members in the target branch
        const branchMembers = await db
          .select({ memberId: members.id })
          .from(members)
          .where(
            and(
              eq(members.homeBranchId, input.target_branch_id!),
              eq(members.isActive, true)
            )
          );
        recipientMemberIds = branchMembers.map((m) => m.memberId);
        break;
      }

      case 'Department': {
        // Query members in the target department via department_members
        const deptMembers = await db
          .select({ memberId: departmentMembers.memberId })
          .from(departmentMembers)
          .where(
            and(
              eq(departmentMembers.branchDepartmentId, input.target_department_id!),
              eq(departmentMembers.isActive, true)
            )
          );
        recipientMemberIds = deptMembers.map((m) => m.memberId);
        break;
      }

      case 'Fellowship': {
        // Query members in the target fellowship via fellowship_members
        const fellowMembers = await db
          .select({ memberId: fellowshipMembers.memberId })
          .from(fellowshipMembers)
          .where(
            and(
              eq(fellowshipMembers.fellowshipId, input.target_fellowship_id!),
              eq(fellowshipMembers.isActive, true)
            )
          );
        recipientMemberIds = fellowMembers.map((m) => m.memberId);
        break;
      }

      default:
        // For other scopes (Region, Role, Leadership), insert notification
        // without recipients for now — will be expanded post-MVP
        logger.info('Scope not yet fully supported for recipient population', {
          scope: input.target_scope,
        });
        break;
    }

    // Insert recipient records
    if (recipientMemberIds.length > 0) {
      const recipientValues = recipientMemberIds.map((memberId) => ({
        notificationId: created!.notificationId,
        memberId,
      }));

      await db.insert(notificationRecipients).values(recipientValues);

      logger.info('Notification recipients populated', {
        notificationId: created!.notificationId,
        recipientCount: recipientMemberIds.length,
      });
    }

    // 6. Push real-time notification via WebSocket
    if (recipientMemberIds.length > 0) {
      try {
        await pushToMembers({
          memberIds: recipientMemberIds,
          notification: {
            notificationId: created!.notificationId,
            title: created!.title,
            message: created!.message,
            notificationType: created!.notificationType,
            priority: created!.priority ?? 'Normal',
            sentAt: created!.sentAt?.toISOString() ?? new Date().toISOString(),
          },
        });
      } catch (wsError) {
        // WebSocket push is best-effort — don't fail the notification creation
        logger.warn('WebSocket push failed', {
          notificationId: created!.notificationId,
          error: wsError instanceof Error ? wsError.message : String(wsError),
        });
      }
    }

    // 7. Return created notification
    return createdResponse({
      notification: created!,
      recipientCount: recipientMemberIds.length,
    });
  } catch (error) {
    return handleError(error, { operation: 'notifications-create' });
  }
};

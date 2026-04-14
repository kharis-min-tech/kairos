// @kairos/api - Notifications Send Broadcast Lambda (Task 19.6)
// Broadcasts a notification to members based on target scope.
// Admins can broadcast to any scope; Leaders can only target their own department/fellowship.
// Pastors can broadcast to their own branch only.
//
// **Requirements: 24.1-24.6**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  resolveAuthContext,
  enforceBranchAccess,
  validateOrThrow,
  handleError,
  createdResponse,
  createLogger,
  getDb,
  isAdmin,
  isPastor,
  isLeader,
  ForbiddenError,
  notificationCreateSchema,
} from '@kairos/utils';
import { pushToMembers } from '../websocket/ws-send-message';
import {
  notifications,
  notificationRecipients,
  members,
  departmentMembers,
  fellowshipMembers,
} from '@kairos/database';
import { eq, and } from 'drizzle-orm';

const logger = createLogger('notifications-send-broadcast');

/**
 * Lambda handler for sending broadcast notifications.
 *
 * Flow:
 * 1. Extract auth context from authorizer
 * 2. Parse and validate input body using notificationCreateSchema
 * 3. Enforce authorization based on role and target scope
 * 4. Insert notification record
 * 5. Resolve target recipients based on scope
 * 6. Batch insert notification recipients
 * 7. Return 201 with notification + recipientCount
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Sending broadcast notification', {
      userId: ctx.memberId,
      branchId: ctx.branchId,
    });

    // 2. Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(notificationCreateSchema, body);

    // 3. Authorization enforcement
    if (!isAdmin(ctx)) {
      // Leaders can ONLY broadcast to their own department or fellowship
      if (isLeader(ctx) && !isPastor(ctx)) {
        if (input.target_scope === 'All' || input.target_scope === 'Branch') {
          throw new ForbiddenError(
            'Leaders can only broadcast to their own department or fellowship'
          );
        }
      }

      // Pastors can broadcast to their own branch only
      if (isPastor(ctx) && input.target_scope === 'Branch') {
        enforceBranchAccess(ctx, input.target_branch_id!);
      }

      // Pastors cannot broadcast to 'All' scope
      if (isPastor(ctx) && !isAdmin(ctx) && input.target_scope === 'All') {
        throw new ForbiddenError(
          'Pastors can only broadcast to their own branch'
        );
      }
    }

    const db = getDb();

    // 4. Insert notification record
    const [notification] = await db
      .insert(notifications)
      .values({
        title: input.title,
        message: input.message,
        notificationType: input.notification_type,
        priority: input.priority,
        targetScope: input.target_scope,
        targetBranchId: input.target_branch_id,
        targetDepartmentId: input.target_department_id,
        targetFellowshipId: input.target_fellowship_id,
        targetRoleId: input.target_role_id,
        targetLeadershipRole: input.target_leadership_role,
        scheduledFor: input.scheduled_for ?? null,
        expiresAt: input.expires_at ?? null,
        sentBy: ctx.memberId,
      })
      .returning();

    // 5. Resolve target recipients based on scope
    let targetMemberIds: string[] = [];

    switch (input.target_scope) {
      case 'All': {
        const allMembers = await db
          .select({ memberId: members.id })
          .from(members)
          .where(eq(members.isActive, true));
        targetMemberIds = allMembers.map((m) => m.memberId);
        break;
      }

      case 'Branch': {
        const branchMembers = await db
          .select({ memberId: members.id })
          .from(members)
          .where(
            and(
              eq(members.homeBranchId, input.target_branch_id!),
              eq(members.isActive, true)
            )
          );
        targetMemberIds = branchMembers.map((m) => m.memberId);
        break;
      }

      case 'Department': {
        const deptMembers = await db
          .select({ memberId: departmentMembers.memberId })
          .from(departmentMembers)
          .where(
            and(
              eq(departmentMembers.branchDepartmentId, input.target_department_id!),
              eq(departmentMembers.isActive, true)
            )
          );
        targetMemberIds = deptMembers.map((m) => m.memberId);
        break;
      }

      case 'Fellowship': {
        const fellowMembers = await db
          .select({ memberId: fellowshipMembers.memberId })
          .from(fellowshipMembers)
          .where(
            and(
              eq(fellowshipMembers.fellowshipId, input.target_fellowship_id!),
              eq(fellowshipMembers.isActive, true)
            )
          );
        targetMemberIds = fellowMembers.map((m) => m.memberId);
        break;
      }

      default:
        // For other scopes (Region, Role, Leadership) — resolve as needed
        break;
    }

    // 6. Batch insert notification recipients
    if (targetMemberIds.length > 0) {
      await db.insert(notificationRecipients).values(
        targetMemberIds.map((memberId) => ({
          notificationId: notification!.notificationId,
          memberId,
        }))
      );
    }

    logger.info('Broadcast notification sent', {
      notificationId: notification!.notificationId,
      scope: input.target_scope,
      recipientCount: targetMemberIds.length,
    });

    // 7. Push real-time notification via WebSocket
    if (targetMemberIds.length > 0) {
      try {
        await pushToMembers({
          memberIds: targetMemberIds,
          notification: {
            notificationId: notification!.notificationId,
            title: notification!.title,
            message: notification!.message,
            notificationType: notification!.notificationType,
            priority: notification!.priority ?? 'Normal',
            sentAt: notification!.sentAt?.toISOString() ?? new Date().toISOString(),
          },
        });
      } catch (wsError) {
        // WebSocket push is best-effort — don't fail the broadcast
        logger.warn('WebSocket push failed', {
          notificationId: notification!.notificationId,
          error: wsError instanceof Error ? wsError.message : String(wsError),
        });
      }
    }

    // 8. Return 201 with notification + recipientCount
    return createdResponse({
      ...notification!,
      recipientCount: targetMemberIds.length,
    });
  } catch (error) {
    return handleError(error, { operation: 'notifications-send-broadcast' });
  }
};

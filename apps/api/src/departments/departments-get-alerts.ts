// @kairos/api - departments-get-alerts Lambda
// Returns department members who haven't been followed up within the threshold
// Default threshold: 7 days (configurable by admin via query parameter)

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and, lt } from 'drizzle-orm';
import {
  branchDepartments,
  departmentMembers,
  members,
} from '@kairos/database';
import {
  resolveAuthContext,
  enforceBranchAccess,
  isAdmin,
  handleError,
  successResponse,
  createLogger,
  getDb,
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '@kairos/utils';

const logger = createLogger('departments-get-alerts');

/** Default follow-up alert threshold in days */
const DEFAULT_THRESHOLD_DAYS = 7;

/**
 * GET /v1/departments/alerts?branch_department_id=123&threshold_days=7
 *
 * Returns members in a department who haven't been followed up
 * within the configured threshold.
 *
 * MVP: Uses the department_members.updated_at field as a proxy for
 * last follow-up date (updated when a follow-up note is added).
 * Members whose updated_at is older than the threshold are flagged.
 *
 * Query parameters:
 * - branch_department_id (required): The branch department to check
 * - threshold_days (optional): Number of days threshold (default: 7)
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    const db = getDb();

    const branchDepartmentId = event.queryStringParameters?.branch_department_id ?? undefined;

    if (!branchDepartmentId) {
      throw new BadRequestError('branch_department_id query parameter is required');
    }

    const thresholdDays = event.queryStringParameters?.threshold_days
      ? parseInt(event.queryStringParameters.threshold_days, 10)
      : DEFAULT_THRESHOLD_DAYS;

    if (isNaN(thresholdDays) || thresholdDays <= 0) {
      throw new BadRequestError('threshold_days must be a positive number');
    }

    // Fetch the branch department
    const [branchDept] = await db
      .select({
        branchDepartmentId: branchDepartments.id,
        branchId: branchDepartments.branchId,
        leadMemberId: branchDepartments.leadMemberId,
        deputyMemberId: branchDepartments.deputyMemberId,
        isActive: branchDepartments.isActive,
      })
      .from(branchDepartments)
      .where(eq(branchDepartments.id, branchDepartmentId))
      .limit(1);

    if (!branchDept) {
      throw new NotFoundError('Branch department', String(branchDepartmentId));
    }

    // Enforce branch isolation
    enforceBranchAccess(ctx, branchDept.branchId);

    // Only department leaders or admin can view alerts
    const isDeptLeader =
      ctx.memberId === branchDept.leadMemberId ||
      ctx.memberId === branchDept.deputyMemberId;

    if (!isDeptLeader && !isAdmin(ctx)) {
      throw new ForbiddenError(
        'Only department leaders or admins can view follow-up alerts'
      );
    }

    // Calculate the threshold date
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

    // Query active department members whose last follow-up (updated_at) is past threshold
    const overdueMembers = await db
      .select({
        departmentMemberId: departmentMembers.id,
        memberId: departmentMembers.memberId,
        joinDate: departmentMembers.joinDate,
        lastFollowupAt: departmentMembers.updatedAt,
        firstName: members.firstName,
        lastName: members.lastName,
        email: members.email,
        phone: members.phone,
      })
      .from(departmentMembers)
      .innerJoin(members, eq(departmentMembers.memberId, members.id))
      .where(
        and(
          eq(departmentMembers.branchDepartmentId, branchDepartmentId),
          eq(departmentMembers.isActive, true),
          lt(departmentMembers.updatedAt, thresholdDate)
        )
      );

    // Calculate days since last follow-up for each member
    const now = new Date();
    const alerts = overdueMembers.map((m) => {
      const lastFollowup = m.lastFollowupAt ?? new Date(0);
      const daysSinceFollowup = Math.floor(
        (now.getTime() - lastFollowup.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        departmentMemberId: m.departmentMemberId,
        memberId: m.memberId,
        memberName: `${m.firstName} ${m.lastName}`,
        email: m.email,
        phone: m.phone,
        joinDate: m.joinDate,
        lastFollowupAt: m.lastFollowupAt?.toISOString() ?? null,
        daysSinceFollowup,
      };
    });

    logger.info('Department follow-up alerts retrieved', {
      branchDepartmentId,
      thresholdDays,
      alertCount: alerts.length,
      requestedBy: ctx.memberId,
    });

    return successResponse({
      data: alerts,
      threshold_days: thresholdDays,
      total_alerts: alerts.length,
    });
  } catch (error) {
    return handleError(error);
  }
};

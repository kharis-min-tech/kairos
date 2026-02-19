// @kairos/api - departments-approve-request Lambda
// Department leader approves a pending member assignment (sets is_active=true)
// Branch admin has visibility but cannot approve

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq } from 'drizzle-orm';
import { branchDepartments, departmentMembers } from '@kairos/database';
import {
  resolveAuthContext,
  enforceBranchAccess,
  handleError,
  successResponse,
  validateOrThrow,
  createLogger,
  getDb,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from '@kairos/utils';
import { z } from 'zod';

const logger = createLogger('departments-approve-request');

/** Validation schema for approving a department member request */
const approveRequestSchema = z.object({
  department_member_id: z.number().int().positive(),
});

/**
 * POST /v1/departments/approve-request
 *
 * Approves a pending department member assignment.
 * - Only the department leader (lead_member_id) can approve
 * - Sets is_active=true on the department_members record
 * - Branch admin has visibility but cannot approve
 * - Sends notification to member (stub/log for MVP)
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    const body = JSON.parse(event.body || '{}');
    const db = getDb();

    const input = validateOrThrow(approveRequestSchema, body);

    // Fetch the department member record
    const [memberRecord] = await db
      .select({
        departmentMemberId: departmentMembers.departmentMemberId,
        branchDepartmentId: departmentMembers.branchDepartmentId,
        memberId: departmentMembers.memberId,
        isActive: departmentMembers.isActive,
      })
      .from(departmentMembers)
      .where(eq(departmentMembers.departmentMemberId, input.department_member_id))
      .limit(1);

    if (!memberRecord) {
      throw new NotFoundError('Department member request', String(input.department_member_id));
    }

    if (memberRecord.isActive) {
      throw new BadRequestError('This member assignment is already active');
    }

    // Fetch the branch department to check leadership
    const [branchDept] = await db
      .select({
        branchDepartmentId: branchDepartments.branchDepartmentId,
        branchId: branchDepartments.branchId,
        leadMemberId: branchDepartments.leadMemberId,
        deputyMemberId: branchDepartments.deputyMemberId,
      })
      .from(branchDepartments)
      .where(eq(branchDepartments.branchDepartmentId, memberRecord.branchDepartmentId))
      .limit(1);

    if (!branchDept) {
      throw new NotFoundError('Branch department', String(memberRecord.branchDepartmentId));
    }

    // Enforce branch isolation
    enforceBranchAccess(ctx, branchDept.branchId);

    // Only the department leader can approve (not branch admin)
    const isLeader =
      ctx.memberId === branchDept.leadMemberId ||
      ctx.memberId === branchDept.deputyMemberId;

    if (!isLeader) {
      throw new ForbiddenError(
        'Only the department leader or deputy can approve join requests'
      );
    }

    // Approve: set is_active=true
    const [updated] = await db
      .update(departmentMembers)
      .set({ isActive: true })
      .where(eq(departmentMembers.departmentMemberId, input.department_member_id))
      .returning();

    // Stub notification for MVP — log it
    logger.info('Department join request approved — notification stub', {
      departmentMemberId: updated!.departmentMemberId,
      memberId: updated!.memberId,
      branchDepartmentId: updated!.branchDepartmentId,
      approvedBy: ctx.memberId,
    });

    return successResponse({
      ...updated!,
      message: 'Member assignment approved successfully',
    });
  } catch (error) {
    return handleError(error);
  }
};

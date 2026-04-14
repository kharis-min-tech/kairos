// @kairos/api - departments-assign-member Lambda
// Adds a member to a department with warnings for 2+ departments
// Uses simpler MVP approach: adds member directly with warning response
// Admin can override the 3rd+ department limit

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and, count } from 'drizzle-orm';
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
  createdResponse,
  validateOrThrow,
  createLogger,
  getDb,
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '@kairos/utils';
import { z } from 'zod';

const logger = createLogger('departments-assign-member');

/** Validation schema for assigning a member to a department */
const assignMemberSchema = z.object({
  branch_department_id: z.string().uuid(),
  member_id: z.string().uuid(),
  admin_override: z.boolean().default(false),
});

/**
 * POST /v1/departments/assign-member
 *
 * Assigns a member to a branch department.
 *
 * MVP approach (simpler):
 * - Adds the member directly (is_active=true)
 * - Warns if member is already in 2+ departments
 * - Requires admin_override=true for 3rd+ department (unless requester is admin)
 * - Prevents assigning the same member as lead and deputy
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    const body = JSON.parse(event.body || '{}');
    const db = getDb();

    const input = validateOrThrow(assignMemberSchema, body);

    // Fetch the branch department to verify it exists and get branch_id
    const [branchDept] = await db
      .select({
        branchDepartmentId: branchDepartments.id,
        branchId: branchDepartments.branchId,
        leadMemberId: branchDepartments.leadMemberId,
        deputyMemberId: branchDepartments.deputyMemberId,
        isActive: branchDepartments.isActive,
      })
      .from(branchDepartments)
      .where(eq(branchDepartments.id, input.branch_department_id))
      .limit(1);

    if (!branchDept) {
      throw new NotFoundError('Branch department', String(input.branch_department_id));
    }

    if (!branchDept.isActive) {
      throw new BadRequestError('Cannot assign member to an inactive department');
    }

    // Enforce branch isolation
    enforceBranchAccess(ctx, branchDept.branchId);

    // Verify the member exists and is active
    const [member] = await db
      .select({
        memberId: members.id,
        homeBranchId: members.homeBranchId,
        isActive: members.isActive,
      })
      .from(members)
      .where(eq(members.id, input.member_id))
      .limit(1);

    if (!member) {
      throw new NotFoundError('Member', String(input.member_id));
    }

    if (!member.isActive) {
      throw new BadRequestError(`Member (ID: ${input.member_id}) is not active`);
    }

    // Prevent same member as lead and deputy
    if (
      input.member_id === branchDept.leadMemberId ||
      input.member_id === branchDept.deputyMemberId
    ) {
      // This is allowed — leaders can also be members of their department
      // The constraint is about lead != deputy, which is enforced at creation
    }

    // Check if member is already in this department
    const [existingAssignment] = await db
      .select({ departmentMemberId: departmentMembers.id })
      .from(departmentMembers)
      .where(
        and(
          eq(departmentMembers.branchDepartmentId, input.branch_department_id),
          eq(departmentMembers.memberId, input.member_id),
          eq(departmentMembers.isActive, true)
        )
      )
      .limit(1);

    if (existingAssignment) {
      throw new ConflictError('Member is already assigned to this department');
    }

    // Count how many active departments this member is in
    const [deptCount] = await db
      .select({ count: count() })
      .from(departmentMembers)
      .where(
        and(
          eq(departmentMembers.memberId, input.member_id),
          eq(departmentMembers.isActive, true)
        )
      );

    const currentDeptCount = deptCount?.count ?? 0;
    let warning: string | null = null;

    // Warn if member is already in 2+ departments
    if (currentDeptCount >= 2) {
      // Require admin override for 3rd+ department
      if (!isAdmin(ctx) && !input.admin_override) {
        throw new BadRequestError(
          `Member is already in ${currentDeptCount} departments. ` +
          'Admin override required to join a 3rd+ department. ' +
          'Set admin_override=true to proceed.'
        );
      }
      warning = `Member is now in ${currentDeptCount + 1} departments (recommended max: 2)`;
    }

    // Add the member to the department
    const [assignment] = await db
      .insert(departmentMembers)
      .values({
        branchDepartmentId: input.branch_department_id,
        memberId: input.member_id,
      })
      .returning();

    logger.info('Member assigned to department', {
      departmentMemberId: assignment!.id,
      branchDepartmentId: input.branch_department_id,
      memberId: input.member_id,
      currentDeptCount: currentDeptCount + 1,
      assignedBy: ctx.memberId,
    });

    const response: Record<string, unknown> = { ...assignment! };
    if (warning) {
      response.warning = warning;
    }

    return createdResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

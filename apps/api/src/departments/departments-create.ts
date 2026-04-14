// @kairos/api - departments-create Lambda
// Creates a global department definition and/or a branch department instance
// with lead_member_id (must be from same branch) and optional deputy_member_id

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq } from 'drizzle-orm';
import { departments, branchDepartments, members } from '@kairos/database';
import {
  resolveAuthContext,
  enforceBranchAccess,
  isAdmin,
  isPastor,
  handleError,
  createdResponse,
  validateOrThrow,
  departmentCreateSchema,
  branchDepartmentCreateSchema,
  createLogger,
  getDb,
  ForbiddenError,
  BadRequestError,
  NotFoundError,
} from '@kairos/utils';

const logger = createLogger('departments-create');

/**
 * POST /v1/departments
 *
 * Creates a global department definition and optionally a branch department instance.
 *
 * Body for global department only:
 *   { department_name, description? }
 *
 * Body for branch department instance:
 *   { department_name?, description?, branch_id, department_id, lead_member_id, deputy_member_id? }
 *
 * If both department_name and branch_id are provided, creates the global department
 * first, then creates the branch instance using the new department_id.
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    const body = JSON.parse(event.body || '{}');
    const db = getDb();

    // Only Admin or Pastor can create departments
    if (!isAdmin(ctx) && !isPastor(ctx)) {
      throw new ForbiddenError('Only admins and pastors can create departments');
    }

    const hasBranchFields = body.branch_id || body.lead_member_id;

    // If creating a branch department instance
    if (hasBranchFields) {
      let departmentId = body.department_id;

      // If department_name is provided but no department_id, create the global department first
      if (body.department_name && !departmentId) {
        const deptInput = validateOrThrow(departmentCreateSchema, {
          department_name: body.department_name,
          description: body.description,
        });

        const [newDept] = await db
          .insert(departments)
          .values({
            departmentName: deptInput.department_name,
            description: deptInput.description,
          })
          .returning();

        departmentId = newDept!.id;
      }

      // Validate branch department input
      const branchDeptInput = validateOrThrow(branchDepartmentCreateSchema, {
        ...body,
        department_id: departmentId,
      });

      // Enforce branch access
      enforceBranchAccess(ctx, branchDeptInput.branch_id);

      // Verify lead member exists, is active, and belongs to the same branch
      await verifyMemberInBranch(db, branchDeptInput.lead_member_id, branchDeptInput.branch_id, 'Lead member');

      // Verify deputy member if provided
      if (branchDeptInput.deputy_member_id) {
        await verifyMemberInBranch(db, branchDeptInput.deputy_member_id, branchDeptInput.branch_id, 'Deputy member');
      }

      // Create the branch department instance
      const [branchDept] = await db
        .insert(branchDepartments)
        .values({
          branchId: branchDeptInput.branch_id,
          departmentId: branchDeptInput.department_id,
          leadMemberId: branchDeptInput.lead_member_id,
          deputyMemberId: branchDeptInput.deputy_member_id ?? null,
        })
        .returning();

      logger.info('Branch department created', {
        branchDepartmentId: branchDept!.id,
        branchId: branchDept!.branchId,
        departmentId: branchDept!.departmentId,
        createdBy: ctx.memberId,
      });

      return createdResponse(branchDept!);
    }

    // Creating a global department definition only (Admin only)
    if (!isAdmin(ctx)) {
      throw new ForbiddenError('Only admins can create global department definitions');
    }

    const deptInput = validateOrThrow(departmentCreateSchema, body);

    const [newDept] = await db
      .insert(departments)
      .values({
        departmentName: deptInput.department_name,
        description: deptInput.description,
      })
      .returning();

    logger.info('Global department created', {
      departmentId: newDept!.id,
      departmentName: newDept!.departmentName,
      createdBy: ctx.memberId,
    });

    return createdResponse(newDept!);
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Verifies that a member exists, is active, and belongs to the specified branch.
 */
async function verifyMemberInBranch(
  db: ReturnType<typeof getDb>,
  memberId: string,
  branchId: string,
  label: string
): Promise<void> {
  const [member] = await db
    .select({
      memberId: members.id,
      homeBranchId: members.homeBranchId,
      isActive: members.isActive,
    })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);

  if (!member) {
    throw new NotFoundError(label, String(memberId));
  }

  if (!member.isActive) {
    throw new BadRequestError(`${label} (ID: ${memberId}) is not active`);
  }

  if (member.homeBranchId !== branchId) {
    throw new BadRequestError(
      `${label} (ID: ${memberId}) does not belong to branch ${branchId}`
    );
  }
}

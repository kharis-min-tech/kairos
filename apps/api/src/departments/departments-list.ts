// @kairos/api - departments-list Lambda
// Lists departments by branch with lead, deputy names, and member count

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and, count } from 'drizzle-orm';
import {
  departments,
  branchDepartments,
  departmentMembers,
  members,
} from '@kairos/database';
import {
  resolveAuthContext,
  enforceBranchAccess,
  handleError,
  successResponse,
  createLogger,
  getDb,
  BadRequestError,
} from '@kairos/utils';

const logger = createLogger('departments-list');

/**
 * GET /v1/departments?branch_id=123
 *
 * Lists departments for a specific branch with:
 * - Department name and description
 * - Lead member name
 * - Deputy member name (if assigned)
 * - Active member count
 *
 * Admins can list departments for any branch.
 * Pastors/Leaders/Members can only list departments for their own branch.
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    const db = getDb();

    const branchId = event.queryStringParameters?.branch_id
      ? parseInt(event.queryStringParameters.branch_id, 10)
      : ctx.branchId;

    if (isNaN(branchId) || branchId <= 0) {
      throw new BadRequestError('Invalid branch_id parameter');
    }

    // Enforce branch isolation
    enforceBranchAccess(ctx, branchId);

    // Query branch departments with department info
    const branchDepts = await db
      .select({
        branchDepartmentId: branchDepartments.branchDepartmentId,
        branchId: branchDepartments.branchId,
        departmentId: branchDepartments.departmentId,
        departmentName: departments.departmentName,
        description: departments.description,
        leadMemberId: branchDepartments.leadMemberId,
        deputyMemberId: branchDepartments.deputyMemberId,
        startDate: branchDepartments.startDate,
        endDate: branchDepartments.endDate,
        isActive: branchDepartments.isActive,
      })
      .from(branchDepartments)
      .innerJoin(departments, eq(branchDepartments.departmentId, departments.departmentId))
      .where(
        and(
          eq(branchDepartments.branchId, branchId),
          eq(branchDepartments.isActive, true)
        )
      );

    // Enrich with lead/deputy names and member counts
    const enrichedDepts = await Promise.all(
      branchDepts.map(async (dept) => {
        // Get lead member name
        const [lead] = await db
          .select({
            firstName: members.firstName,
            lastName: members.lastName,
          })
          .from(members)
          .where(eq(members.memberId, dept.leadMemberId))
          .limit(1);

        // Get deputy member name if assigned
        let deputy = null;
        if (dept.deputyMemberId) {
          const [dep] = await db
            .select({
              firstName: members.firstName,
              lastName: members.lastName,
            })
            .from(members)
            .where(eq(members.memberId, dept.deputyMemberId))
            .limit(1);
          deputy = dep ?? null;
        }

        // Count active members
        const [memberCount] = await db
          .select({ count: count() })
          .from(departmentMembers)
          .where(
            and(
              eq(departmentMembers.branchDepartmentId, dept.branchDepartmentId),
              eq(departmentMembers.isActive, true)
            )
          );

        return {
          ...dept,
          leadName: lead ? `${lead.firstName} ${lead.lastName}` : null,
          deputyName: deputy ? `${deputy.firstName} ${deputy.lastName}` : null,
          memberCount: memberCount?.count ?? 0,
        };
      })
    );

    logger.info('Departments listed', {
      branchId,
      count: enrichedDepts.length,
      requestedBy: ctx.memberId,
    });

    return successResponse({ data: enrichedDepts });
  } catch (error) {
    return handleError(error);
  }
};

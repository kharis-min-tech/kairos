// @kairos/api - Members Get Lambda
// Returns a member profile with personal info, church info,
// department assignments, and fellowship membership
// Members see own profile only; admins/pastors see branch members

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and } from 'drizzle-orm';
import {
  members,
  departmentMembers,
  branchDepartments,
  departments,
  fellowshipMembers,
  fellowships,
} from '@kairos/database';
import {
  resolveAuthContext,
  isAdmin,
  isPastor,
  handleError,
  successResponse,
  createLogger,
  getDb,
  NotFoundError,
  ForbiddenError,
} from '@kairos/utils';

const logger = createLogger('members-get');

/**
 * Lambda handler for getting a single member profile.
 *
 * Path parameter: memberId
 *
 * Access control:
 * - Admin: can view any member
 * - Pastor: can view members in their branch
 * - Member: can view only their own profile
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    const targetMemberId = parseInt(event.pathParameters?.memberId || '', 10);

    if (isNaN(targetMemberId)) {
      throw new NotFoundError('Member', event.pathParameters?.memberId);
    }

    logger.info('Getting member', { userId: ctx.memberId, targetMemberId });

    const db = getDb();

    // 2. Fetch the member
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.memberId, targetMemberId))
      .limit(1);

    if (!member) {
      throw new NotFoundError('Member', String(targetMemberId));
    }

    // 3. Enforce access control
    if (!isAdmin(ctx) && !isPastor(ctx)) {
      // Regular members can only view their own profile
      if (ctx.memberId !== targetMemberId) {
        throw new ForbiddenError('You can only view your own profile');
      }
    } else if (isPastor(ctx) && !isAdmin(ctx)) {
      // Pastors can only view members in their branch
      if (member.homeBranchId !== ctx.branchId) {
        throw new ForbiddenError('You can only view members in your branch');
      }
    }

    // 4. Fetch department assignments
    const departmentAssignments = await db
      .select({
        departmentMemberId: departmentMembers.departmentMemberId,
        departmentName: departments.departmentName,
        branchDepartmentId: departmentMembers.branchDepartmentId,
        joinDate: departmentMembers.joinDate,
        isActive: departmentMembers.isActive,
      })
      .from(departmentMembers)
      .innerJoin(
        branchDepartments,
        eq(departmentMembers.branchDepartmentId, branchDepartments.branchDepartmentId)
      )
      .innerJoin(
        departments,
        eq(branchDepartments.departmentId, departments.departmentId)
      )
      .where(
        and(
          eq(departmentMembers.memberId, targetMemberId),
          eq(departmentMembers.isActive, true)
        )
      );

    // 5. Fetch fellowship membership
    const fellowshipMembership = await db
      .select({
        fellowshipMemberId: fellowshipMembers.fellowshipMemberId,
        fellowshipName: fellowships.fellowshipName,
        fellowshipId: fellowshipMembers.fellowshipId,
        joinDate: fellowshipMembers.joinDate,
        isActive: fellowshipMembers.isActive,
      })
      .from(fellowshipMembers)
      .innerJoin(
        fellowships,
        eq(fellowshipMembers.fellowshipId, fellowships.fellowshipId)
      )
      .where(
        and(
          eq(fellowshipMembers.memberId, targetMemberId),
          eq(fellowshipMembers.isActive, true)
        )
      );

    // 6. Return member profile with related data
    return successResponse({
      ...member,
      departments: departmentAssignments,
      fellowships: fellowshipMembership,
    });
  } catch (error) {
    return handleError(error, { operation: 'members-get' });
  }
};

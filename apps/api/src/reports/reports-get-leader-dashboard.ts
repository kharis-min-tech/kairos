// @kairos/api - Reports Get Leader Dashboard Lambda (Task 21.3)
// Leader dashboard returning department/fellowship-scoped metrics:
//   - groupMemberCount: members in the department or fellowship
//   - recentAttendance: last 4 meetings/services attendance
//   - membersNeedingFollowUp: count of members overdue for follow-up
//   - pendingJoinRequests: count of pending department join requests (department only)
//
// Query params: departmentId or fellowshipId (at least one required)
// Leaders can only see their own department/fellowship. Admins can see any.
//
// **Requirements: 28.1-28.5**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  resolveAuthContext,
  handleError,
  successResponse,
  createLogger,
  getDb,
  isAdmin,
  isLeader,
  ForbiddenError,
} from '@kairos/utils';
import {
  departmentMembers,
  fellowshipMembers,
  branchDepartments,
  serviceAttendance,
  services,
} from '@kairos/database';
import { eq, and, sql, desc, lt } from 'drizzle-orm';

const logger = createLogger('reports-get-leader-dashboard');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Generating leader dashboard', { userId: ctx.memberId });

    // 2. Only leaders and admins can access
    if (!isAdmin(ctx) && !isLeader(ctx)) {
      throw new ForbiddenError('Only leaders and administrators can access the leader dashboard');
    }

    // 3. Parse query parameters
    const params = event.queryStringParameters || {};
    const departmentId = params.departmentId ? parseInt(params.departmentId, 10) : undefined;
    const fellowshipId = params.fellowshipId ? parseInt(params.fellowshipId, 10) : undefined;

    if (!departmentId && !fellowshipId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: { code: 'VALIDATION_ERROR', message: 'Either departmentId or fellowshipId query parameter is required' },
        }),
      };
    }

    const db = getDb();

    if (departmentId) {
      // --- Department dashboard ---

      // 4a. Verify leader has access to this department
      if (!isAdmin(ctx)) {
        const [dept] = await db
          .select({ leadMemberId: branchDepartments.leadMemberId })
          .from(branchDepartments)
          .where(eq(branchDepartments.branchDepartmentId, departmentId));

        if (!dept || dept.leadMemberId !== ctx.memberId) {
          throw new ForbiddenError('You can only view your own department dashboard');
        }
      }

      // 5a. Group member count
      const [memberCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(departmentMembers)
        .where(
          and(
            eq(departmentMembers.branchDepartmentId, departmentId),
            eq(departmentMembers.isActive, true)
          )
        );

      // 6a. Recent attendance (last 4 services for the branch this department belongs to)
      const [deptInfo] = await db
        .select({ branchId: branchDepartments.branchId })
        .from(branchDepartments)
        .where(eq(branchDepartments.branchDepartmentId, departmentId));

      let recentAttendance: { serviceId: number; serviceDate: unknown; presentCount: number; totalCount: number }[] = [];
      if (deptInfo) {
        recentAttendance = await db
          .select({
            serviceId: services.serviceId,
            serviceDate: services.serviceDate,
            presentCount: sql<number>`count(CASE WHEN ${serviceAttendance.attendanceStatus} = 'Present' THEN 1 END)::int`.as('present_count'),
            totalCount: sql<number>`count(${serviceAttendance.memberId})::int`.as('total_count'),
          })
          .from(services)
          .innerJoin(serviceAttendance, eq(services.serviceId, serviceAttendance.serviceId))
          .where(eq(services.branchId, deptInfo.branchId))
          .groupBy(services.serviceId, services.serviceDate)
          .orderBy(desc(services.serviceDate))
          .limit(4);
      }

      // 7a. Pending join requests (department members with isActive = false and no leaveDate)
      const [pendingCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(departmentMembers)
        .where(
          and(
            eq(departmentMembers.branchDepartmentId, departmentId),
            eq(departmentMembers.isActive, false),
            sql`${departmentMembers.leaveDate} IS NULL`
          )
        );

      // 8a. Members needing follow-up (not followed up in 7+ days) — Req 28.3
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [followUpCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(departmentMembers)
        .where(
          and(
            eq(departmentMembers.branchDepartmentId, departmentId),
            eq(departmentMembers.isActive, true),
            lt(departmentMembers.updatedAt, sevenDaysAgo)
          )
        );

      logger.info('Leader department dashboard generated', { departmentId });

      return successResponse({
        type: 'department',
        departmentId,
        groupMemberCount: memberCount?.count ?? 0,
        recentAttendance: recentAttendance.map((row) => ({
          serviceId: row.serviceId,
          serviceDate: row.serviceDate,
          presentCount: row.presentCount ?? 0,
          totalCount: row.totalCount ?? 0,
        })),
        membersNeedingFollowUp: followUpCount?.count ?? 0,
        pendingJoinRequests: pendingCount?.count ?? 0,
      });
    } else {
      // --- Fellowship dashboard ---

      // 4b. Verify leader has access to this fellowship
      if (!isAdmin(ctx)) {
        // Check if the member is the fellowship leader by checking fellowshipMembers
        const [membership] = await db
          .select({ memberId: fellowshipMembers.memberId })
          .from(fellowshipMembers)
          .where(
            and(
              eq(fellowshipMembers.fellowshipId, fellowshipId!),
              eq(fellowshipMembers.memberId, ctx.memberId),
              eq(fellowshipMembers.isActive, true)
            )
          );

        if (!membership) {
          throw new ForbiddenError('You can only view your own fellowship dashboard');
        }
      }

      // 5b. Group member count
      const [memberCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(fellowshipMembers)
        .where(
          and(
            eq(fellowshipMembers.fellowshipId, fellowshipId!),
            eq(fellowshipMembers.isActive, true)
          )
        );

      // 6b. Recent attendance (last 4 services — simplified for MVP)
      const recentAttendance = await db
        .select({
          serviceId: services.serviceId,
          serviceDate: services.serviceDate,
          presentCount: sql<number>`count(CASE WHEN ${serviceAttendance.attendanceStatus} = 'Present' THEN 1 END)::int`.as('present_count'),
          totalCount: sql<number>`count(${serviceAttendance.memberId})::int`.as('total_count'),
        })
        .from(services)
        .innerJoin(serviceAttendance, eq(services.serviceId, serviceAttendance.serviceId))
        .groupBy(services.serviceId, services.serviceDate)
        .orderBy(desc(services.serviceDate))
        .limit(4);

      logger.info('Leader fellowship dashboard generated', { fellowshipId });

      return successResponse({
        type: 'fellowship',
        fellowshipId,
        groupMemberCount: memberCount?.count ?? 0,
        recentAttendance: recentAttendance.map((row) => ({
          serviceId: row.serviceId,
          serviceDate: row.serviceDate,
          presentCount: row.presentCount ?? 0,
          totalCount: row.totalCount ?? 0,
        })),
      });
    }
  } catch (error) {
    return handleError(error, { operation: 'reports-get-leader-dashboard' });
  }
};

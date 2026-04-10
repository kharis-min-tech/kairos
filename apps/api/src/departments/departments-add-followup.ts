// @kairos/api - departments-add-followup Lambda
// Records a follow-up note for a department member
// Notes visible to all leaders of that department (collaboration)
//
// MVP Note: No dedicated department_followups table exists in the schema.
// For MVP, we validate the request, log the follow-up, and update the
// department member's updatedAt timestamp to track last follow-up time.
// A proper follow-up notes table can be added in Phase 2.

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq } from 'drizzle-orm';
import { branchDepartments, departmentMembers, members } from '@kairos/database';
import {
  resolveAuthContext,
  enforceBranchAccess,
  isAdmin,
  handleError,
  createdResponse,
  validateOrThrow,
  createLogger,
  getDb,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from '@kairos/utils';
import { z } from 'zod';

const logger = createLogger('departments-add-followup');

/** Validation schema for adding a follow-up note */
const addFollowupSchema = z.object({
  department_member_id: z.number().int().positive(),
  notes: z.string().trim().min(1, 'Notes are required').max(2000),
  followup_date: z.coerce.date().optional(),
});

/**
 * POST /v1/departments/followup
 *
 * Records a follow-up note for a department member.
 * - Only department leaders (lead or deputy) can add follow-up notes
 * - Admin can also add follow-up notes
 * - Notes are visible to all leaders of that department (collaboration)
 * - Updates the department member's updatedAt to track last follow-up
 *
 * MVP: Logs the follow-up and updates the member record timestamp.
 * A dedicated follow-up notes table will be added in Phase 2.
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    const body = JSON.parse(event.body || '{}');
    const db = getDb();

    const input = validateOrThrow(addFollowupSchema, body);

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
      throw new NotFoundError('Department member', String(input.department_member_id));
    }

    if (!memberRecord.isActive) {
      throw new BadRequestError('Cannot add follow-up for an inactive department member');
    }

    // Fetch the branch department to check leadership and branch
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

    // Only department leaders or admin can add follow-up notes
    const isDeptLeader =
      ctx.memberId === branchDept.leadMemberId ||
      ctx.memberId === branchDept.deputyMemberId;

    if (!isDeptLeader && !isAdmin(ctx)) {
      throw new ForbiddenError(
        'Only department leaders or admins can add follow-up notes'
      );
    }

    // Update the department member's updatedAt to track last follow-up
    const [updated] = await db
      .update(departmentMembers)
      .set({ updatedAt: new Date() })
      .where(eq(departmentMembers.departmentMemberId, input.department_member_id))
      .returning();

    // Get the member's name for the response
    const [memberInfo] = await db
      .select({
        firstName: members.firstName,
        lastName: members.lastName,
      })
      .from(members)
      .where(eq(members.memberId, memberRecord.memberId))
      .limit(1);

    const followupDate = input.followup_date ?? new Date();

    // Log the follow-up note (visible to all leaders for collaboration)
    logger.info('Department follow-up note added', {
      departmentMemberId: input.department_member_id,
      memberId: memberRecord.memberId,
      memberName: memberInfo ? `${memberInfo.firstName} ${memberInfo.lastName}` : 'Unknown',
      branchDepartmentId: memberRecord.branchDepartmentId,
      followupDate: followupDate.toISOString(),
      notes: input.notes,
      addedBy: ctx.memberId,
    });

    return createdResponse({
      department_member_id: input.department_member_id,
      member_id: memberRecord.memberId,
      member_name: memberInfo ? `${memberInfo.firstName} ${memberInfo.lastName}` : null,
      notes: input.notes,
      followup_date: followupDate.toISOString(),
      added_by: ctx.memberId,
      last_followup_at: updated!.updatedAt?.toISOString() ?? new Date().toISOString(),
      message: 'Follow-up note recorded successfully',
    });
  } catch (error) {
    return handleError(error);
  }
};

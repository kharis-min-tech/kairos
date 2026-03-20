// @kairos/api - Fellowship Get Lambda
// Returns fellowship details with all current members, leader, and co-leader info.

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  resolveAuthContext,
  enforceBranchAccess,
  handleError,
  successResponse,
  createLogger,
  getDb,
  NotFoundError,
  BadRequestError,
} from '@kairos/utils';
import { fellowships, fellowshipMembers, members } from '@kairos/database';
import { eq, and } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

const logger = createLogger('fellowships-get');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.setContext({ userId: ctx.memberId, branchId: ctx.branchId });

    // 2. Extract fellowship ID from path parameters
    const fellowshipId = parseInt(
      event.pathParameters?.fellowshipId || '',
      10
    );
    if (isNaN(fellowshipId)) {
      throw new BadRequestError('Invalid fellowship ID');
    }

    logger.info('Getting fellowship details', { fellowshipId });

    const db = getDb();

    // 3. Create aliases for leader and co-leader joins
    const leaderMember = alias(members, 'leader');
    const coLeaderMember = alias(members, 'co_leader');

    // 4. Fetch fellowship with leader and co-leader details
    const [fellowship] = await db
      .select({
        fellowshipId: fellowships.fellowshipId,
        fellowshipName: fellowships.fellowshipName,
        branchId: fellowships.branchId,
        description: fellowships.description,
        leaderId: fellowships.leaderId,
        coLeaderId: fellowships.coLeaderId,
        meetingSchedule: fellowships.meetingSchedule,
        isActive: fellowships.isActive,
        createdAt: fellowships.createdAt,
        updatedAt: fellowships.updatedAt,
        leaderFirstName: leaderMember.firstName,
        leaderLastName: leaderMember.lastName,
        leaderEmail: leaderMember.email,
        coLeaderFirstName: coLeaderMember.firstName,
        coLeaderLastName: coLeaderMember.lastName,
        coLeaderEmail: coLeaderMember.email,
      })
      .from(fellowships)
      .leftJoin(leaderMember, eq(fellowships.leaderId, leaderMember.memberId))
      .leftJoin(
        coLeaderMember,
        eq(fellowships.coLeaderId, coLeaderMember.memberId)
      )
      .where(eq(fellowships.fellowshipId, fellowshipId))
      .limit(1);

    if (!fellowship) {
      throw new NotFoundError('Fellowship', String(fellowshipId));
    }

    // 5. Enforce branch isolation
    enforceBranchAccess(ctx, fellowship.branchId);

    // 6. Fetch all current (active) members of this fellowship
    const memberRows = await db
      .select({
        fellowshipMemberId: fellowshipMembers.fellowshipMemberId,
        memberId: fellowshipMembers.memberId,
        joinDate: fellowshipMembers.joinDate,
        notes: fellowshipMembers.notes,
        firstName: members.firstName,
        lastName: members.lastName,
        email: members.email,
        phone: members.phone,
      })
      .from(fellowshipMembers)
      .innerJoin(members, eq(fellowshipMembers.memberId, members.memberId))
      .where(
        and(
          eq(fellowshipMembers.fellowshipId, fellowshipId),
          eq(fellowshipMembers.isActive, true)
        )
      );

    // 7. Format response
    const response = {
      fellowshipId: fellowship.fellowshipId,
      fellowshipName: fellowship.fellowshipName,
      branchId: fellowship.branchId,
      description: fellowship.description,
      leaderId: fellowship.leaderId,
      coLeaderId: fellowship.coLeaderId,
      meetingSchedule: fellowship.meetingSchedule,
      isActive: fellowship.isActive,
      createdAt: fellowship.createdAt,
      updatedAt: fellowship.updatedAt,
      leader: fellowship.leaderFirstName
        ? {
            memberId: fellowship.leaderId,
            firstName: fellowship.leaderFirstName,
            lastName: fellowship.leaderLastName,
            email: fellowship.leaderEmail,
          }
        : null,
      coLeader: fellowship.coLeaderFirstName
        ? {
            memberId: fellowship.coLeaderId,
            firstName: fellowship.coLeaderFirstName,
            lastName: fellowship.coLeaderLastName,
            email: fellowship.coLeaderEmail,
          }
        : null,
      members: memberRows.map((m) => ({
        fellowshipMemberId: m.fellowshipMemberId,
        memberId: m.memberId,
        joinDate: m.joinDate,
        notes: m.notes,
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        phone: m.phone,
      })),
      memberCount: memberRows.length,
    };

    logger.info('Fellowship details retrieved', {
      fellowshipId,
      memberCount: memberRows.length,
    });

    return successResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

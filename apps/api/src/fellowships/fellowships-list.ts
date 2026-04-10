// @kairos/api - Fellowship List Lambda
// Lists fellowships by branch with leader, co-leader names, and member count.
// Supports pagination and enforces branch isolation.

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  resolveAuthContext,
  enforceBranchAccess,
  handleError,
  successResponse,
  createLogger,
  getDb,
  BadRequestError,
} from '@kairos/utils';
import { fellowships, members } from '@kairos/database';
import { eq, and, sql, count } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

const logger = createLogger('fellowships-list');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.setContext({ userId: ctx.memberId, branchId: ctx.branchId });
    logger.info('Listing fellowships');

    // 2. Parse query parameters
    const params = event.queryStringParameters || {};
    const page = Math.max(1, parseInt(params.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || '50', 10)));
    const offset = (page - 1) * limit;
    const branchId = params.branchId
      ? parseInt(params.branchId, 10)
      : ctx.branchId;

    if (isNaN(branchId)) {
      throw new BadRequestError('Invalid branchId parameter');
    }

    // 3. Enforce branch isolation
    enforceBranchAccess(ctx, branchId);

    const db = getDb();

    // 4. Create aliases for leader and co-leader joins
    const leaderMember = alias(members, 'leader');
    const coLeaderMember = alias(members, 'co_leader');

    // 5. Query fellowships with leader/co-leader names and member count
    const fellowshipRows = await db
      .select({
        fellowshipId: fellowships.fellowshipId,
        fellowshipName: fellowships.fellowshipName,
        branchId: fellowships.branchId,
        description: fellowships.description,
        leaderId: fellowships.leaderId,
        coLeaderId: fellowships.coLeaderId,
        meetingSchedule: fellowships.meetingSchedule,
        location: fellowships.location,
        isActive: fellowships.isActive,
        createdAt: fellowships.createdAt,
        updatedAt: fellowships.updatedAt,
        leaderFirstName: leaderMember.firstName,
        leaderLastName: leaderMember.lastName,
        coLeaderFirstName: coLeaderMember.firstName,
        coLeaderLastName: coLeaderMember.lastName,
        memberCount: sql<number>`(
          SELECT COUNT(*)::int FROM fellowship_members fm
          WHERE fm.fellowship_id = ${fellowships.fellowshipId}
          AND fm.is_active = TRUE
        )`.as('member_count'),
      })
      .from(fellowships)
      .leftJoin(leaderMember, eq(fellowships.leaderId, leaderMember.memberId))
      .leftJoin(
        coLeaderMember,
        eq(fellowships.coLeaderId, coLeaderMember.memberId)
      )
      .where(
        and(
          eq(fellowships.branchId, branchId),
          eq(fellowships.isActive, true)
        )
      )
      .limit(limit)
      .offset(offset);

    // 6. Get total count for pagination
    const [totalResult] = await db
      .select({ total: count() })
      .from(fellowships)
      .where(
        and(
          eq(fellowships.branchId, branchId),
          eq(fellowships.isActive, true)
        )
      );

    const total = totalResult?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    // 7. Format response
    const data = fellowshipRows.map((row) => ({
      fellowshipId: row.fellowshipId,
      fellowshipName: row.fellowshipName,
      branchId: row.branchId,
      description: row.description,
      leaderId: row.leaderId,
      coLeaderId: row.coLeaderId,
      meetingSchedule: row.meetingSchedule,
      location: row.location,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      leader: row.leaderFirstName
        ? { firstName: row.leaderFirstName, lastName: row.leaderLastName }
        : null,
      coLeader: row.coLeaderFirstName
        ? {
            firstName: row.coLeaderFirstName,
            lastName: row.coLeaderLastName,
          }
        : null,
      memberCount: row.memberCount ?? 0,
    }));

    logger.info('Fellowships listed', { count: data.length, total });

    return successResponse({
      data,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    return handleError(error);
  }
};

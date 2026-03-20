// @kairos/api - Attendance List Fellowship Lambda
// Lists fellowship meeting attendance with attendance percentage per member.
// Percentage = (present / total meetings) * 100
//
// **Requirements: 11.7**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and, sql, desc } from 'drizzle-orm';
import {
  fellowships,
  fellowshipMeetings,
  fellowshipMembers,
  members,
} from '@kairos/database';
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

const logger = createLogger('attendance-list-fellowship');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.info('Listing fellowship attendance', { userId: ctx.memberId, branchId: ctx.branchId });

    const params = event.queryStringParameters || {};
    const fellowshipId = params.fellowshipId ? parseInt(params.fellowshipId, 10) : undefined;

    if (!fellowshipId || isNaN(fellowshipId)) {
      throw new BadRequestError('fellowshipId query parameter is required');
    }

    const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || '50', 10) || 50));
    const offset = (page - 1) * limit;

    const db = getDb();

    // Verify fellowship exists and get branch
    const [fellowship] = await db
      .select({
        fellowshipId: fellowships.fellowshipId,
        branchId: fellowships.branchId,
        fellowshipName: fellowships.fellowshipName,
      })
      .from(fellowships)
      .where(eq(fellowships.fellowshipId, fellowshipId))
      .limit(1);

    if (!fellowship) {
      throw new NotFoundError('Fellowship', String(fellowshipId));
    }

    enforceBranchAccess(ctx, fellowship.branchId);

    // Get meetings list
    const meetings = await db
      .select({
        meetingId: fellowshipMeetings.meetingId,
        meetingDate: fellowshipMeetings.meetingDate,
        meetingTitle: fellowshipMeetings.meetingTitle,
        meetingTopic: fellowshipMeetings.meetingTopic,
        location: fellowshipMeetings.location,
        presentCount: sql<number>`(
          SELECT COUNT(*)::int FROM fellowship_meeting_attendance fma
          WHERE fma.meeting_id = ${fellowshipMeetings.meetingId}
          AND fma.attendance_status = 'Present'
        )`.as('present_count'),
        totalRecords: sql<number>`(
          SELECT COUNT(*)::int FROM fellowship_meeting_attendance fma
          WHERE fma.meeting_id = ${fellowshipMeetings.meetingId}
        )`.as('total_records'),
      })
      .from(fellowshipMeetings)
      .where(eq(fellowshipMeetings.fellowshipId, fellowshipId))
      .orderBy(desc(fellowshipMeetings.meetingDate))
      .limit(limit)
      .offset(offset);

    // Get total meeting count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(fellowshipMeetings)
      .where(eq(fellowshipMeetings.fellowshipId, fellowshipId));

    const totalMeetings = countResult?.count ?? 0;

    // Get member attendance percentages
    const memberStats = await db
      .select({
        memberId: fellowshipMembers.memberId,
        firstName: members.firstName,
        lastName: members.lastName,
        presentCount: sql<number>`(
          SELECT COUNT(*)::int FROM fellowship_meeting_attendance fma
          INNER JOIN fellowship_meetings fm ON fm.meeting_id = fma.meeting_id
          WHERE fma.member_id = ${fellowshipMembers.memberId}
          AND fm.fellowship_id = ${fellowshipId}
          AND fma.attendance_status = 'Present'
        )`.as('present_count'),
      })
      .from(fellowshipMembers)
      .innerJoin(members, eq(fellowshipMembers.memberId, members.memberId))
      .where(
        and(
          eq(fellowshipMembers.fellowshipId, fellowshipId),
          eq(fellowshipMembers.isActive, true)
        )
      );

    const memberAttendance = memberStats.map(m => ({
      memberId: m.memberId,
      firstName: m.firstName,
      lastName: m.lastName,
      presentCount: m.presentCount ?? 0,
      totalMeetings,
      attendancePercentage: totalMeetings > 0
        ? Math.round(((m.presentCount ?? 0) / totalMeetings) * 100)
        : 0,
    }));

    const totalPages = Math.ceil(totalMeetings / limit);

    logger.info('Fellowship attendance listed', { fellowshipId, totalMeetings });

    return successResponse({
      fellowship: {
        fellowshipId: fellowship.fellowshipId,
        fellowshipName: fellowship.fellowshipName,
      },
      meetings,
      memberAttendance,
      pagination: { page, limit, total: totalMeetings, totalPages },
    });
  } catch (error) {
    return handleError(error);
  }
};

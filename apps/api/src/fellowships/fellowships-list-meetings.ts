// @kairos/api - Fellowship List Meetings Lambda
// Lists meetings for a fellowship with attendance summary.

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
import { fellowships, fellowshipMeetings } from '@kairos/database';
import { eq, sql, desc } from 'drizzle-orm';

const logger = createLogger('fellowships-list-meetings');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.setContext({ userId: ctx.memberId, branchId: ctx.branchId });

    const fellowshipId = parseInt(
      event.pathParameters?.fellowshipId || '',
      10
    );
    if (isNaN(fellowshipId)) {
      throw new BadRequestError('Invalid fellowship ID');
    }

    const db = getDb();

    // Verify fellowship exists
    const [fellowship] = await db
      .select({ branchId: fellowships.branchId })
      .from(fellowships)
      .where(eq(fellowships.fellowshipId, fellowshipId))
      .limit(1);

    if (!fellowship) {
      throw new NotFoundError('Fellowship', String(fellowshipId));
    }

    enforceBranchAccess(ctx, fellowship.branchId);

    // Get meetings with attendance summary
    const meetings = await db
      .select({
        meetingId: fellowshipMeetings.meetingId,
        fellowshipId: fellowshipMeetings.fellowshipId,
        meetingDate: fellowshipMeetings.meetingDate,
        meetingTitle: fellowshipMeetings.meetingTitle,
        meetingTopic: fellowshipMeetings.meetingTopic,
        meetingNotes: fellowshipMeetings.meetingNotes,
        location: fellowshipMeetings.location,
        durationMinutes: fellowshipMeetings.durationMinutes,
        createdBy: fellowshipMeetings.createdBy,
        createdAt: fellowshipMeetings.createdAt,
        presentCount: sql<number>`(
          SELECT COUNT(*)::int FROM fellowship_meeting_attendance fma
          WHERE fma.meeting_id = ${fellowshipMeetings.meetingId}
          AND fma.attendance_status = 'Present'
        )`.as('present_count'),
        totalCount: sql<number>`(
          SELECT COUNT(*)::int FROM fellowship_meeting_attendance fma
          WHERE fma.meeting_id = ${fellowshipMeetings.meetingId}
        )`.as('total_count'),
      })
      .from(fellowshipMeetings)
      .where(eq(fellowshipMeetings.fellowshipId, fellowshipId))
      .orderBy(desc(fellowshipMeetings.meetingDate));

    logger.info('Fellowship meetings listed', {
      fellowshipId,
      count: meetings.length,
    });

    return successResponse({
      fellowshipId,
      meetings: meetings.map((m) => ({
        ...m,
        attendancePercentage:
          m.totalCount > 0
            ? Math.round((m.presentCount / m.totalCount) * 100)
            : 0,
      })),
    });
  } catch (error) {
    return handleError(error);
  }
};

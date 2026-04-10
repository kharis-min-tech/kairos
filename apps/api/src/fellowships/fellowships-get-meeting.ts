// @kairos/api - Fellowship Get Meeting Lambda
// Gets a single meeting with full attendance details.

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
import {
  fellowships,
  fellowshipMeetings,
  fellowshipMeetingAttendance,
  members,
} from '@kairos/database';
import { eq } from 'drizzle-orm';

const logger = createLogger('fellowships-get-meeting');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.setContext({ userId: ctx.memberId, branchId: ctx.branchId });

    const meetingId = parseInt(event.pathParameters?.meetingId || '', 10);
    if (isNaN(meetingId)) {
      throw new BadRequestError('Invalid meeting ID');
    }

    const db = getDb();

    // Get meeting
    const [meeting] = await db
      .select()
      .from(fellowshipMeetings)
      .where(eq(fellowshipMeetings.meetingId, meetingId))
      .limit(1);

    if (!meeting) {
      throw new NotFoundError('Fellowship meeting', String(meetingId));
    }

    // Verify fellowship and enforce branch isolation
    const [fellowship] = await db
      .select({ branchId: fellowships.branchId })
      .from(fellowships)
      .where(eq(fellowships.fellowshipId, meeting.fellowshipId))
      .limit(1);

    if (!fellowship) {
      throw new NotFoundError('Fellowship', String(meeting.fellowshipId));
    }

    enforceBranchAccess(ctx, fellowship.branchId);

    // Get attendance records with member details
    const attendance = await db
      .select({
        memberId: fellowshipMeetingAttendance.memberId,
        attendanceStatus: fellowshipMeetingAttendance.attendanceStatus,
        arrivalTime: fellowshipMeetingAttendance.arrivalTime,
        notes: fellowshipMeetingAttendance.notes,
        recordedAt: fellowshipMeetingAttendance.recordedAt,
        firstName: members.firstName,
        lastName: members.lastName,
        email: members.email,
        phone: members.phone,
      })
      .from(fellowshipMeetingAttendance)
      .innerJoin(
        members,
        eq(fellowshipMeetingAttendance.memberId, members.memberId)
      )
      .where(eq(fellowshipMeetingAttendance.meetingId, meetingId));

    logger.info('Fellowship meeting retrieved', {
      meetingId,
      attendanceCount: attendance.length,
    });

    return successResponse({
      ...meeting,
      attendance,
    });
  } catch (error) {
    return handleError(error);
  }
};

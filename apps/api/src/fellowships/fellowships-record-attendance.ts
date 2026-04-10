// @kairos/api - Fellowship Record Attendance Lambda
// Records attendance for a fellowship meeting (bulk operation).

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import {
  resolveAuthContext,
  enforceBranchAccess,
  validateOrThrow,
  handleError,
  successResponse,
  createLogger,
  getDb,
  NotFoundError,
} from '@kairos/utils';
import { fellowships, fellowshipMeetings, fellowshipMeetingAttendance } from '@kairos/database';
import { eq } from 'drizzle-orm';

const logger = createLogger('fellowships-record-attendance');

const recordAttendanceSchema = z.object({
  meeting_id: z.number().int().positive(),
  attendance: z.array(
    z.object({
      member_id: z.number().int().positive(),
      attendance_status: z.enum(['Present', 'Absent', 'Excused', 'Late']),
      arrival_time: z.string().datetime().optional(),
      notes: z.string().trim().max(500).optional(),
    })
  ),
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.setContext({ userId: ctx.memberId, branchId: ctx.branchId });

    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(recordAttendanceSchema, body);

    const db = getDb();

    // Verify meeting exists and get fellowship
    const [meeting] = await db
      .select({
        meetingId: fellowshipMeetings.meetingId,
        fellowshipId: fellowshipMeetings.fellowshipId,
      })
      .from(fellowshipMeetings)
      .where(eq(fellowshipMeetings.meetingId, input.meeting_id))
      .limit(1);

    if (!meeting) {
      throw new NotFoundError('Fellowship meeting', String(input.meeting_id));
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

    // Bulk insert/update attendance records
    const results = [];
    for (const record of input.attendance) {
      // Use INSERT ... ON CONFLICT to handle duplicates
      const [result] = await db
        .insert(fellowshipMeetingAttendance)
        .values({
          meetingId: input.meeting_id,
          memberId: record.member_id,
          attendanceStatus: record.attendance_status,
          arrivalTime: record.arrival_time ? new Date(record.arrival_time) : null,
          notes: record.notes,
          recordedBy: ctx.memberId,
        })
        .onConflictDoUpdate({
          target: [
            fellowshipMeetingAttendance.meetingId,
            fellowshipMeetingAttendance.memberId,
          ],
          set: {
            attendanceStatus: record.attendance_status,
            arrivalTime: record.arrival_time ? new Date(record.arrival_time) : null,
            notes: record.notes,
            recordedBy: ctx.memberId,
            recordedAt: new Date(),
          },
        })
        .returning();

      results.push(result);
    }

    logger.info('Fellowship attendance recorded', {
      meetingId: input.meeting_id,
      recordCount: results.length,
    });

    return successResponse({
      meetingId: input.meeting_id,
      recordsProcessed: results.length,
      attendance: results,
    });
  } catch (error) {
    return handleError(error);
  }
};

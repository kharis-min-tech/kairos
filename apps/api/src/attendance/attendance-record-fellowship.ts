// @kairos/api - Attendance Record Fellowship Lambda
// Creates a fellowship meeting and records bulk attendance.
// Supports statuses: Present, Absent, Excused, Late.
// Fellowship leader or delegate can record.
// Prevents duplicate records (unique on meeting_id + member_id).
//
// **Requirements: 11.1-11.6**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  resolveAuthContext,
  enforceBranchAccess,
  validateOrThrow,
  fellowshipMeetingCreateSchema,
  fellowshipAttendanceBulkSchema,
  handleError,
  createdResponse,
  createLogger,
  getDb,
  ConflictError,
  NotFoundError,
  ForbiddenError,
  isAdmin,
} from '@kairos/utils';
import {
  fellowships,
  fellowshipMeetings,
  fellowshipMeetingAttendance,
} from '@kairos/database';
import { eq, and } from 'drizzle-orm';

const logger = createLogger('attendance-record-fellowship');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.info('Recording fellowship attendance', { userId: ctx.memberId, branchId: ctx.branchId });

    const body = JSON.parse(event.body || '{}');

    // If meeting_id is provided, record attendance for existing meeting
    if (body.meeting_id && !body.fellowship_id) {
      const input = validateOrThrow(fellowshipAttendanceBulkSchema, body);
      const db = getDb();

      // Verify meeting exists
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

      // Verify fellowship and branch access
      const [fellowship] = await db
        .select({
          fellowshipId: fellowships.fellowshipId,
          branchId: fellowships.branchId,
          leaderId: fellowships.leaderId,
          coLeaderId: fellowships.coLeaderId,
        })
        .from(fellowships)
        .where(eq(fellowships.fellowshipId, meeting.fellowshipId))
        .limit(1);

      if (!fellowship) {
        throw new NotFoundError('Fellowship', String(meeting.fellowshipId));
      }

      enforceBranchAccess(ctx, fellowship.branchId);

      // Check leader/delegate permission (admin, pastor, or fellowship leader/co-leader)
      if (
        !isAdmin(ctx) &&
        !ctx.roles.includes('Pastor') &&
        ctx.memberId !== fellowship.leaderId &&
        ctx.memberId !== fellowship.coLeaderId
      ) {
        throw new ForbiddenError('Only fellowship leader, co-leader, pastor, or admin can record attendance');
      }

      // Check for duplicates in DB
      const existingRecords = await db
        .select({ memberId: fellowshipMeetingAttendance.memberId })
        .from(fellowshipMeetingAttendance)
        .where(eq(fellowshipMeetingAttendance.meetingId, input.meeting_id));

      const existingDbMemberIds = new Set(existingRecords.map(r => r.memberId));
      const duplicates = input.records.filter(r => existingDbMemberIds.has(r.member_id));

      if (duplicates.length > 0) {
        throw new ConflictError(
          `Attendance already recorded for member(s): ${duplicates.map(d => d.member_id).join(', ')}`
        );
      }

      const inserted = await db
        .insert(fellowshipMeetingAttendance)
        .values(
          input.records.map(r => ({
            meetingId: input.meeting_id,
            memberId: r.member_id,
            attendanceStatus: r.attendance_status,
            notes: r.notes,
            recordedBy: ctx.memberId,
          }))
        )
        .returning();

      logger.info('Fellowship attendance recorded', {
        meetingId: input.meeting_id,
        count: inserted.length,
      });

      return createdResponse({ meetingId: input.meeting_id, recordsCreated: inserted.length });
    }

    // Create new meeting + attendance
    const meetingInput = validateOrThrow(fellowshipMeetingCreateSchema, body);
    const db = getDb();

    // Verify fellowship exists and get branch
    const [fellowship] = await db
      .select({
        fellowshipId: fellowships.fellowshipId,
        branchId: fellowships.branchId,
        leaderId: fellowships.leaderId,
        coLeaderId: fellowships.coLeaderId,
      })
      .from(fellowships)
      .where(eq(fellowships.fellowshipId, meetingInput.fellowship_id))
      .limit(1);

    if (!fellowship) {
      throw new NotFoundError('Fellowship', String(meetingInput.fellowship_id));
    }

    enforceBranchAccess(ctx, fellowship.branchId);

    // Check leader/delegate permission
    if (
      !isAdmin(ctx) &&
      !ctx.roles.includes('Pastor') &&
      ctx.memberId !== fellowship.leaderId &&
      ctx.memberId !== fellowship.coLeaderId
    ) {
      throw new ForbiddenError('Only fellowship leader, co-leader, pastor, or admin can record attendance');
    }

    // Check for duplicate meeting
    const [existingMeeting] = await db
      .select({ meetingId: fellowshipMeetings.meetingId })
      .from(fellowshipMeetings)
      .where(
        and(
          eq(fellowshipMeetings.fellowshipId, meetingInput.fellowship_id),
          eq(fellowshipMeetings.meetingDate, meetingInput.meeting_date)
        )
      )
      .limit(1);

    if (existingMeeting) {
      throw new ConflictError('A meeting already exists for this fellowship on this date');
    }

    const [created] = await db
      .insert(fellowshipMeetings)
      .values({
        fellowshipId: meetingInput.fellowship_id,
        meetingDate: meetingInput.meeting_date,
        meetingTitle: meetingInput.meeting_title,
        meetingTopic: meetingInput.meeting_topic,
        meetingNotes: meetingInput.meeting_notes,
        location: meetingInput.location,
        durationMinutes: meetingInput.duration_minutes,
        createdBy: ctx.memberId,
      })
      .returning();

    // If attendance records are included, insert them
    if (body.records && Array.isArray(body.records) && body.records.length > 0) {
      const attendanceInput = validateOrThrow(fellowshipAttendanceBulkSchema, {
        meeting_id: created!.meetingId,
        records: body.records,
      });

      await db
        .insert(fellowshipMeetingAttendance)
        .values(
          attendanceInput.records.map(r => ({
            meetingId: created!.meetingId,
            memberId: r.member_id,
            attendanceStatus: r.attendance_status,
            notes: r.notes,
            recordedBy: ctx.memberId,
          }))
        );
    }

    logger.info('Fellowship meeting created', { meetingId: created!.meetingId });
    return createdResponse(created!);
  } catch (error) {
    return handleError(error);
  }
};

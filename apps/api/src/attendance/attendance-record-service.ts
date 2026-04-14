// @kairos/api - Attendance Record Service Lambda
// Creates a service and records bulk attendance for branch members.
// Supports statuses: Present, Absent, Virtual.
// Prevents duplicate attendance records (unique on service_id + member_id).
// Pastors restricted to their branch only.
//
// **Requirements: 10.1-10.8**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  resolveAuthContext,
  enforceBranchAccess,
  validateOrThrow,
  serviceCreateSchema,
  serviceAttendanceBulkSchema,
  handleError,
  createdResponse,
  createLogger,
  getDb,
  ConflictError,
  NotFoundError,
} from '@kairos/utils';
import { services, serviceAttendance } from '@kairos/database';
import { eq, and } from 'drizzle-orm';

const logger = createLogger('attendance-record-service');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.info('Recording service attendance', { userId: ctx.memberId, branchId: ctx.branchId });

    const body = JSON.parse(event.body || '{}');

    // If service_id is provided, record attendance for existing service
    // Otherwise, create a new service first
    if (body.service_id) {
      const input = validateOrThrow(serviceAttendanceBulkSchema, body);
      const db = getDb();

      // Verify service exists and belongs to the correct branch
      const [service] = await db
        .select({ serviceId: services.id, branchId: services.branchId })
        .from(services)
        .where(eq(services.id, input.service_id))
        .limit(1);

      if (!service) {
        throw new NotFoundError('Service', String(input.service_id));
      }

      enforceBranchAccess(ctx, service.branchId);

      // Check for duplicate records
      const existingMemberIds = new Set<string>();
      for (const record of input.records) {
        if (existingMemberIds.has(record.member_id)) {
          throw new ConflictError(`Duplicate member_id ${record.member_id} in request`);
        }
        existingMemberIds.add(record.member_id);
      }

      // Check for existing attendance records in DB
      const existingRecords = await db
        .select({ memberId: serviceAttendance.memberId })
        .from(serviceAttendance)
        .where(eq(serviceAttendance.serviceId, input.service_id));

      const existingDbMemberIds = new Set(existingRecords.map(r => r.memberId));
      const duplicates = input.records.filter(r => existingDbMemberIds.has(r.member_id));

      if (duplicates.length > 0) {
        throw new ConflictError(
          `Attendance already recorded for member(s): ${duplicates.map(d => d.member_id).join(', ')}`
        );
      }

      // Insert attendance records
      const inserted = await db
        .insert(serviceAttendance)
        .values(
          input.records.map(r => ({
            serviceId: input.service_id as string,
            memberId: r.member_id as string,
            attendanceStatus: r.attendance_status,
            isFirstTimeVisitor: r.is_first_time_visitor,
            notes: r.notes,
            recordedBy: ctx.memberId,
          }))
        )
        .returning();

      logger.info('Service attendance recorded', {
        serviceId: input.service_id,
        count: inserted.length,
      });

      return createdResponse({ serviceId: input.service_id, recordsCreated: inserted.length });
    }

    // Create new service + attendance
    const serviceInput = validateOrThrow(serviceCreateSchema, body);
    enforceBranchAccess(ctx, serviceInput.branch_id);

    const db = getDb();

    // Check for duplicate service
    const [existing] = await db
      .select({ serviceId: services.id })
      .from(services)
      .where(
        and(
          eq(services.branchId, serviceInput.branch_id),
          eq(services.serviceDate, serviceInput.service_date),
          eq(services.serviceType, serviceInput.service_type)
        )
      )
      .limit(1);

    if (existing) {
      throw new ConflictError('A service with this date and type already exists for this branch');
    }

    const [created] = await db
      .insert(services)
      .values({
        branchId: serviceInput.branch_id,
        serviceDate: serviceInput.service_date,
        serviceType: serviceInput.service_type,
        serviceTitle: serviceInput.service_title,
        preacherId: serviceInput.preacher_id,
        topic: serviceInput.topic,
        notes: serviceInput.notes,
        expectedAttendance: serviceInput.expected_attendance,
      })
      .returning();

    // If attendance records are included, insert them
    if (body.records && Array.isArray(body.records) && body.records.length > 0) {
      const attendanceInput = validateOrThrow(serviceAttendanceBulkSchema, {
        service_id: created!.id,
        records: body.records,
      });

      await db
        .insert(serviceAttendance)
        .values(
          attendanceInput.records.map(r => ({
            serviceId: created!.id,
            memberId: r.member_id,
            attendanceStatus: r.attendance_status,
            isFirstTimeVisitor: r.is_first_time_visitor,
            notes: r.notes,
            recordedBy: ctx.memberId,
          }))
        );
    }

    logger.info('Service created', { serviceId: created!.id });
    return createdResponse(created!);
  } catch (error) {
    return handleError(error);
  }
};

import { pgTable, uuid, varchar, boolean, timestamp, index, primaryKey } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { services } from './services';
import { members } from './members';

/**
 * service_attendance — present-only attendance for a service.
 *
 * Rows exist ONLY for people who attended; absence is inferred from the lack
 * of a row, so there is no 'Absent' status. Composite PK (serviceId, memberId)
 * mirrors fellowship_meeting_attendance's (meetingId, memberId).
 */
export const serviceAttendance = pgTable('service_attendance', {
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  attendanceStatus: varchar('attendance_status', { length: 10 }).notNull(),
  arrivalTime: timestamp('arrival_time'),
  isFirstTimeVisitor: boolean('is_first_time_visitor').notNull().default(false),
  recordedBy: uuid('recorded_by').notNull().references(() => members.id),
  recordedAt: timestamp('recorded_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.serviceId, table.memberId] }),
  index('idx_service_attendance_service_id').on(table.serviceId),
  index('idx_service_attendance_member_id').on(table.memberId),
  index('idx_service_attendance_recorded_by').on(table.recordedBy),
  sql`CHECK (attendance_status IN ('Present', 'Late', 'Virtual'))`,
]);

export const serviceAttendanceRelations = relations(serviceAttendance, ({ one }) => ({
  service: one(services, { fields: [serviceAttendance.serviceId], references: [services.id] }),
  member: one(members, {
    fields: [serviceAttendance.memberId],
    references: [members.id],
    relationName: 'serviceAttendanceMember',
  }),
  recorder: one(members, {
    fields: [serviceAttendance.recordedBy],
    references: [members.id],
    relationName: 'serviceAttendanceRecorder',
  }),
}));

export type ServiceAttendance = typeof serviceAttendance.$inferSelect;
export type NewServiceAttendance = typeof serviceAttendance.$inferInsert;

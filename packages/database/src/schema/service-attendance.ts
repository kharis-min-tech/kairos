import { pgTable, uuid, varchar, timestamp, boolean, primaryKey, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { services } from './services';
import { members } from './members';

export const serviceAttendance = pgTable('service_attendance', {
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  attendanceStatus: varchar('attendance_status', { length: 20 }).notNull(),
  arrivalTime: timestamp('arrival_time'),
  isFirstTimeVisitor: boolean('is_first_time_visitor').default(false).notNull(),
  visitorName: varchar('visitor_name', { length: 200 }),
  visitorPhone: varchar('visitor_phone', { length: 20 }),
  visitorEmail: varchar('visitor_email', { length: 100 }),
  recordedBy: uuid('recorded_by').notNull().references(() => members.id, { onDelete: 'restrict' }),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.serviceId, table.memberId] }),
  index('idx_service_attendance_service_id').on(table.serviceId),
  index('idx_service_attendance_member_id').on(table.memberId),
  index('idx_service_attendance_status').on(table.attendanceStatus),
  index('idx_service_attendance_first_time').on(table.isFirstTimeVisitor),
  sql`CHECK (attendance_status IN ('Present', 'Absent', 'Virtual', 'Late'))`,
]);

export const serviceAttendanceRelations = relations(serviceAttendance, ({ one }) => ({
  service: one(services, { fields: [serviceAttendance.serviceId], references: [services.id] }),
  member: one(members, { fields: [serviceAttendance.memberId], references: [members.id] }),
  recorder: one(members, { fields: [serviceAttendance.recordedBy], references: [members.id], relationName: 'attendanceRecorder' }),
}));

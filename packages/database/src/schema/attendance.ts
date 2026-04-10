import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  index,
  unique,
  check,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { members } from './members';
import { branches } from './branches';

// ============================================================================
// SERVICES
// Purpose: Store weekly service information for each branch
// ============================================================================
export const services = pgTable(
  'services',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    serviceDate: timestamp('service_date').notNull(),
    serviceType: varchar('service_type', { length: 50 }).notNull(),
    serviceTitle: varchar('service_title', { length: 200 }),
    preacherId: uuid('preacher_id').references(() => members.id, {
      onDelete: 'set null',
    }),
    topic: varchar('topic', { length: 200 }),
    notes: text('notes'),
    expectedAttendance: integer('expected_attendance'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_services_branch_id').on(table.branchId),
    index('idx_services_service_date').on(table.serviceDate),
    index('idx_services_service_type').on(table.serviceType),
    unique('uq_services_unique').on(table.branchId, table.serviceDate, table.serviceType),
    check(
      'chk_services_type',
      sql`${table.serviceType} IN ('Sunday Service', 'Midweek Service', 'Special Service', 'Prayer Meeting', 'Other')`
    ),
    check(
      'chk_services_expected_attendance',
      sql`${table.expectedAttendance} IS NULL OR ${table.expectedAttendance} >= 0`
    ),
  ]
);

// ============================================================================
// SERVICE_ATTENDANCE
// Purpose: Store attendance records for services
// ============================================================================
export const serviceAttendance = pgTable(
  'service_attendance',
  {
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    attendanceStatus: varchar('attendance_status', { length: 20 }).notNull(),
    arrivalTime: timestamp('arrival_time'),
    isFirstTimeVisitor: boolean('is_first_time_visitor').default(false),
    notes: text('notes'),
    recordedAt: timestamp('recorded_at').defaultNow().notNull(),
    recordedBy: uuid('recorded_by').references(() => members.id, {
      onDelete: 'set null',
    }),
  },
  (table) => [
    primaryKey({ columns: [table.serviceId, table.memberId] }),
    index('idx_service_attendance_service_id').on(table.serviceId),
    index('idx_service_attendance_member_id').on(table.memberId),
    index('idx_service_attendance_status').on(table.attendanceStatus),
    check(
      'chk_service_attendance_status',
      sql`${table.attendanceStatus} IN ('Present', 'Absent', 'Virtual')`
    ),
  ]
);

// ── Relations ──────────────────────────────────────────────

export const servicesRelations = relations(services, ({ one, many }) => ({
  branch: one(branches, { fields: [services.branchId], references: [branches.id] }),
  preacher: one(members, { fields: [services.preacherId], references: [members.id] }),
  attendance: many(serviceAttendance),
}));

export const serviceAttendanceRelations = relations(serviceAttendance, ({ one }) => ({
  service: one(services, { fields: [serviceAttendance.serviceId], references: [services.id] }),
  member: one(members, { fields: [serviceAttendance.memberId], references: [members.id] }),
  recorder: one(members, { fields: [serviceAttendance.recordedBy], references: [members.id], relationName: 'recordedAttendance' }),
}));


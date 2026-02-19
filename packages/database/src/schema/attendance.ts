import {
  pgTable,
  serial,
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
import { sql } from 'drizzle-orm';
import { branches, members } from './core';

// ============================================================================
// SERVICES
// Purpose: Store weekly service information for each branch
// ============================================================================
export const services = pgTable(
  'services',
  {
    serviceId: serial('service_id').primaryKey(),
    branchId: integer('branch_id')
      .notNull()
      .references(() => branches.branchId, { onDelete: 'cascade' }),
    serviceDate: timestamp('service_date').notNull(),
    serviceType: varchar('service_type', { length: 50 }).notNull(),
    serviceTitle: varchar('service_title', { length: 200 }),
    preacherId: integer('preacher_id').references(() => members.memberId, {
      onDelete: 'set null',
    }),
    topic: varchar('topic', { length: 200 }),
    notes: text('notes'),
    expectedAttendance: integer('expected_attendance'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
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
    serviceId: integer('service_id')
      .notNull()
      .references(() => services.serviceId, { onDelete: 'cascade' }),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.memberId, { onDelete: 'cascade' }),
    attendanceStatus: varchar('attendance_status', { length: 20 }).notNull(),
    arrivalTime: timestamp('arrival_time'),
    isFirstTimeVisitor: boolean('is_first_time_visitor').default(false),
    notes: text('notes'),
    recordedAt: timestamp('recorded_at').defaultNow(),
    recordedBy: integer('recorded_by').references(() => members.memberId, {
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

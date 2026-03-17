import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  date,
  index,
  unique,
  check,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { branches, members } from './core';

// ============================================================================
// FELLOWSHIPS
// Purpose: Store fellowship group information
// ============================================================================
export const fellowships = pgTable(
  'fellowships',
  {
    fellowshipId: serial('fellowship_id').primaryKey(),
    fellowshipName: varchar('fellowship_name', { length: 150 }).notNull(),
    branchId: integer('branch_id')
      .notNull()
      .references(() => branches.branchId, { onDelete: 'cascade' }),
    fellowshipType: varchar('fellowship_type', { length: 50 }),
    description: text('description'),
    leaderId: integer('leader_id').references(() => members.memberId, {
      onDelete: 'set null',
    }),
    coLeaderId: integer('co_leader_id').references(() => members.memberId, {
      onDelete: 'set null',
    }),
    meetingSchedule: varchar('meeting_schedule', { length: 200 }),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('idx_fellowships_branch_id').on(table.branchId),
    index('idx_fellowships_leader_id').on(table.leaderId),
    index('idx_fellowships_is_active').on(table.isActive),
    unique('uq_fellowships_name_branch').on(table.fellowshipName, table.branchId),
    check(
      'chk_fellowships_leaders_different',
      sql`${table.leaderId} IS NULL OR ${table.coLeaderId} IS NULL OR ${table.leaderId} != ${table.coLeaderId}`
    ),
  ]
);

// ============================================================================
// FELLOWSHIP_MEMBERS
// Purpose: Store member assignments to fellowships (many-to-many relationship)
// ============================================================================
export const fellowshipMembers = pgTable(
  'fellowship_members',
  {
    fellowshipMemberId: serial('fellowship_member_id').primaryKey(),
    fellowshipId: integer('fellowship_id')
      .notNull()
      .references(() => fellowships.fellowshipId, { onDelete: 'cascade' }),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.memberId, { onDelete: 'cascade' }),
    joinDate: date('join_date').notNull().default(sql`CURRENT_DATE`),
    leaveDate: date('leave_date'),
    isActive: boolean('is_active').default(true),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('idx_fellowship_members_fellowship_id').on(table.fellowshipId),
    index('idx_fellowship_members_member_id').on(table.memberId),
    index('idx_fellowship_members_is_active').on(table.isActive),
    unique('uq_fellowship_members_assignment').on(
      table.fellowshipId,
      table.memberId,
      table.joinDate
    ),
    check(
      'chk_fellowship_members_dates',
      sql`${table.leaveDate} IS NULL OR ${table.leaveDate} >= ${table.joinDate}`
    ),
  ]
);

// ============================================================================
// FELLOWSHIP_MEETINGS
// Purpose: Store fellowship meeting information
// ============================================================================
export const fellowshipMeetings = pgTable(
  'fellowship_meetings',
  {
    meetingId: serial('meeting_id').primaryKey(),
    fellowshipId: integer('fellowship_id')
      .notNull()
      .references(() => fellowships.fellowshipId, { onDelete: 'cascade' }),
    meetingDate: timestamp('meeting_date').notNull(),
    meetingTitle: varchar('meeting_title', { length: 200 }),
    meetingTopic: varchar('meeting_topic', { length: 200 }),
    meetingNotes: text('meeting_notes'),
    location: varchar('location', { length: 200 }),
    durationMinutes: integer('duration_minutes'),
    createdBy: integer('created_by').references(() => members.memberId, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('idx_fellowship_meetings_fellowship_id').on(table.fellowshipId),
    index('idx_fellowship_meetings_meeting_date').on(table.meetingDate),
    unique('uq_fellowship_meetings_date').on(table.fellowshipId, table.meetingDate),
    check(
      'chk_fellowship_meetings_duration',
      sql`${table.durationMinutes} IS NULL OR ${table.durationMinutes} > 0`
    ),
  ]
);

// ============================================================================
// FELLOWSHIP_MEETING_ATTENDANCE
// Purpose: Store attendance records for fellowship meetings
// ============================================================================
export const fellowshipMeetingAttendance = pgTable(
  'fellowship_meeting_attendance',
  {
    meetingId: integer('meeting_id')
      .notNull()
      .references(() => fellowshipMeetings.meetingId, { onDelete: 'cascade' }),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.memberId, { onDelete: 'cascade' }),
    attendanceStatus: varchar('attendance_status', { length: 20 })
      .notNull()
      .default('Present'),
    arrivalTime: timestamp('arrival_time'),
    notes: text('notes'),
    recordedAt: timestamp('recorded_at').defaultNow(),
    recordedBy: integer('recorded_by').references(() => members.memberId, {
      onDelete: 'set null',
    }),
  },
  (table) => [
    primaryKey({ columns: [table.meetingId, table.memberId] }),
    index('idx_fellowship_meeting_attendance_meeting_id').on(table.meetingId),
    index('idx_fellowship_meeting_attendance_member_id').on(table.memberId),
    index('idx_fellowship_meeting_attendance_status').on(table.attendanceStatus),
    check(
      'chk_fellowship_meeting_attendance_status',
      sql`${table.attendanceStatus} IN ('Present', 'Absent', 'Excused', 'Late')`
    ),
  ]
);

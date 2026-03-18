import { pgTable, uuid, varchar, text, timestamp, index, primaryKey } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { fellowshipMeetings } from './fellowship-meetings';
import { members } from './members';

export const fellowshipMeetingAttendance = pgTable('fellowship_meeting_attendance', {
  meetingId: uuid('meeting_id').notNull().references(() => fellowshipMeetings.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  attendanceStatus: varchar('attendance_status', { length: 20 }).notNull().default('Present'),
  arrivalTime: timestamp('arrival_time'),
  notes: text('notes'),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  recordedBy: uuid('recorded_by').references(() => members.id, { onDelete: 'set null' }),
}, (table) => [
  primaryKey({ columns: [table.meetingId, table.memberId] }),
  index('idx_fma_meeting_id').on(table.meetingId),
  index('idx_fma_member_id').on(table.memberId),
  index('idx_fma_status').on(table.attendanceStatus),
  sql`CHECK (attendance_status IN ('Present', 'Absent', 'Excused', 'Late'))`,
]);

export const fellowshipMeetingAttendanceRelations = relations(fellowshipMeetingAttendance, ({ one }) => ({
  meeting: one(fellowshipMeetings, { fields: [fellowshipMeetingAttendance.meetingId], references: [fellowshipMeetings.id] }),
  member: one(members, { fields: [fellowshipMeetingAttendance.memberId], references: [members.id] }),
  recorder: one(members, { fields: [fellowshipMeetingAttendance.recordedBy], references: [members.id] }),
}));

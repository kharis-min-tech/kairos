import { pgTable, uuid, varchar, text, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { fellowships } from './fellowships';
import { members } from './members';
import { fellowshipMeetingAttendance } from './fellowship-meeting-attendance';

export const fellowshipMeetings = pgTable('fellowship_meetings', {
  id: uuid('id').defaultRandom().primaryKey(),
  fellowshipId: uuid('fellowship_id').notNull().references(() => fellowships.id, { onDelete: 'cascade' }),
  meetingDate: timestamp('meeting_date').notNull(),
  meetingTitle: varchar('meeting_title', { length: 200 }),
  meetingTopic: varchar('meeting_topic', { length: 200 }),
  meetingNotes: text('meeting_notes'),
  location: varchar('location', { length: 200 }),
  durationMinutes: integer('duration_minutes'),
  createdBy: uuid('created_by').references(() => members.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_fellowship_meetings_fellowship_id').on(table.fellowshipId),
  index('idx_fellowship_meetings_meeting_date').on(table.meetingDate),
  uniqueIndex('uq_fellowship_meetings_date').on(table.fellowshipId, table.meetingDate),
  sql`CHECK (duration_minutes IS NULL OR duration_minutes > 0)`,
]);

export const fellowshipMeetingsRelations = relations(fellowshipMeetings, ({ one, many }) => ({
  fellowship: one(fellowships, { fields: [fellowshipMeetings.fellowshipId], references: [fellowships.id] }),
  createdByMember: one(members, { fields: [fellowshipMeetings.createdBy], references: [members.id] }),
  attendance: many(fellowshipMeetingAttendance),
}));

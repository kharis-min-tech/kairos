import { pgTable, uuid, varchar, text, integer, date, timestamp, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { fellowships } from './fellowships';
import { members } from './members';

export const fellowshipFollowups = pgTable('fellowship_followups', {
  id: uuid('id').defaultRandom().primaryKey(),
  fellowshipId: uuid('fellowship_id').notNull().references(() => fellowships.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  recordedById: uuid('recorded_by_id').notNull().references(() => members.id, { onDelete: 'restrict' }),
  assignedToId: uuid('assigned_to_id').references(() => members.id, { onDelete: 'set null' }),
  contactedAt: timestamp('contacted_at').defaultNow().notNull(),
  contactMethod: varchar('contact_method', { length: 30 }).notNull(),
  contactStatus: varchar('contact_status', { length: 30 }).notNull(),
  durationMinutes: integer('duration_minutes'),
  notes: text('notes'),
  nextFollowUpDate: date('next_follow_up_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_fellowship_followups_fellowship_id').on(table.fellowshipId),
  index('idx_fellowship_followups_member_id').on(table.memberId),
  index('idx_fellowship_followups_contacted_at').on(table.contactedAt),
  index('idx_fellowship_followups_contact_status').on(table.contactStatus),
  sql`CHECK (duration_minutes IS NULL OR duration_minutes > 0)`,
]);

export const fellowshipFollowupsRelations = relations(fellowshipFollowups, ({ one }) => ({
  fellowship: one(fellowships, { fields: [fellowshipFollowups.fellowshipId], references: [fellowships.id] }),
  member: one(members, { fields: [fellowshipFollowups.memberId], references: [members.id], relationName: 'fellowshipFollowupSubject' }),
  recordedBy: one(members, { fields: [fellowshipFollowups.recordedById], references: [members.id], relationName: 'fellowshipFollowupRecorder' }),
  assignedTo: one(members, { fields: [fellowshipFollowups.assignedToId], references: [members.id], relationName: 'fellowshipFollowupAssignee' }),
}));

import { pgTable, uuid, varchar, text, integer, date, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { souls } from './souls';
import { members } from './members';

export const followUps = pgTable('follow_ups', {
  id: uuid('id').defaultRandom().primaryKey(),
  soulId: uuid('soul_id').notNull().references(() => souls.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  followUpDate: timestamp('follow_up_date').defaultNow().notNull(),
  contactMethod: varchar('contact_method', { length: 30 }),
  contactStatus: varchar('contact_status', { length: 30 }).notNull(),
  urgencyLevel: varchar('urgency_level', { length: 20 }), // RED, AMBER, GREEN
  durationMinutes: integer('duration_minutes'),
  notes: text('notes'),
  nextFollowUpDate: date('next_follow_up_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  soulIdIdx: index('idx_follow_ups_soul_id').on(table.soulId),
  memberIdIdx: index('idx_follow_ups_member_id').on(table.memberId),
  followUpDateIdx: index('idx_follow_ups_follow_up_date').on(table.followUpDate),
  contactStatusIdx: index('idx_follow_ups_contact_status').on(table.contactStatus),
  urgencyLevelIdx: index('idx_follow_ups_urgency_level').on(table.urgencyLevel),
  nextFollowUpDateIdx: index('idx_follow_ups_next_follow_up_date').on(table.nextFollowUpDate),
}));

export const followUpsRelations = relations(followUps, ({ one }) => ({
  soul: one(souls, {
    fields: [followUps.soulId],
    references: [souls.id],
  }),
  member: one(members, {
    fields: [followUps.memberId],
    references: [members.id],
  }),
}));

import { pgTable, uuid, varchar, text, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { outreachPrograms } from './outreach-programs';
import { members } from './members';

export const outreachParticipants = pgTable('outreach_participants', {
  outreachId: uuid('outreach_id').notNull().references(() => outreachPrograms.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.outreachId, table.memberId] }),
  outreachIdIdx: index('idx_outreach_participants_outreach_id').on(table.outreachId),
  memberIdIdx: index('idx_outreach_participants_member_id').on(table.memberId),
}));

export const outreachParticipantsRelations = relations(outreachParticipants, ({ one }) => ({
  outreachProgram: one(outreachPrograms, {
    fields: [outreachParticipants.outreachId],
    references: [outreachPrograms.id],
  }),
  member: one(members, {
    fields: [outreachParticipants.memberId],
    references: [members.id],
  }),
}));

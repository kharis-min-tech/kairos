import { pgTable, uuid, date, boolean, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { fellowships } from './fellowships';
import { members } from './members';

export const fellowshipMembers = pgTable('fellowship_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  fellowshipId: uuid('fellowship_id').notNull().references(() => fellowships.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  joinDate: date('join_date').notNull().defaultNow(),
  leaveDate: date('leave_date'),
  isActive: boolean('is_active').default(true).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_fellowship_members_fellowship_id').on(table.fellowshipId),
  index('idx_fellowship_members_member_id').on(table.memberId),
  index('idx_fellowship_members_is_active').on(table.isActive),
  uniqueIndex('uq_fellowship_members_assignment').on(table.fellowshipId, table.memberId, table.joinDate),
  sql`CHECK (leave_date IS NULL OR leave_date >= join_date)`,
]);

export const fellowshipMembersRelations = relations(fellowshipMembers, ({ one }) => ({
  fellowship: one(fellowships, { fields: [fellowshipMembers.fellowshipId], references: [fellowships.id] }),
  member: one(members, { fields: [fellowshipMembers.memberId], references: [members.id] }),
}));

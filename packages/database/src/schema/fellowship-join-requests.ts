import { pgTable, uuid, varchar, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { fellowships } from './fellowships';
import { members } from './members';

export const fellowshipJoinRequests = pgTable('fellowship_join_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  fellowshipId: uuid('fellowship_id').notNull().references(() => fellowships.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  notes: text('notes'),
  reviewedBy: uuid('reviewed_by').references(() => members.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_fellowship_join_requests_fellowship_id').on(table.fellowshipId),
  index('idx_fellowship_join_requests_member_id').on(table.memberId),
  index('idx_fellowship_join_requests_status').on(table.status),
  uniqueIndex('uq_fellowship_join_requests_member').on(table.fellowshipId, table.memberId),
  sql`CHECK (status IN ('pending', 'approved', 'rejected'))`,
]);

export const fellowshipJoinRequestsRelations = relations(fellowshipJoinRequests, ({ one }) => ({
  fellowship: one(fellowships, { fields: [fellowshipJoinRequests.fellowshipId], references: [fellowships.id] }),
  member: one(members, { fields: [fellowshipJoinRequests.memberId], references: [members.id] }),
  reviewer: one(members, { fields: [fellowshipJoinRequests.reviewedBy], references: [members.id] }),
}));

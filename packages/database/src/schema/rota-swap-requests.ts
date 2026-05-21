import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { rotaAssignments } from './rota-assignments';
import { members } from './members';

export const rotaSwapRequests = pgTable('rota_swap_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  assignmentId: uuid('assignment_id').notNull().references(() => rotaAssignments.id, { onDelete: 'cascade' }),
  requestedById: uuid('requested_by_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  proposedMemberId: uuid('proposed_member_id').references(() => members.id, { onDelete: 'set null' }),
  reason: text('reason'),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  reviewedById: uuid('reviewed_by_id').references(() => members.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at'),
  reviewNotes: text('review_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_rota_swap_requests_assignment_id').on(table.assignmentId),
  index('idx_rota_swap_requests_requested_by_id').on(table.requestedById),
  index('idx_rota_swap_requests_status').on(table.status),
  sql`CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))`,
]);

export const rotaSwapRequestsRelations = relations(rotaSwapRequests, ({ one }) => ({
  assignment: one(rotaAssignments, { fields: [rotaSwapRequests.assignmentId], references: [rotaAssignments.id] }),
  requestedBy: one(members, { fields: [rotaSwapRequests.requestedById], references: [members.id], relationName: 'swapRequester' }),
  proposedMember: one(members, { fields: [rotaSwapRequests.proposedMemberId], references: [members.id], relationName: 'swapProposed' }),
  reviewedBy: one(members, { fields: [rotaSwapRequests.reviewedById], references: [members.id], relationName: 'swapReviewer' }),
}));

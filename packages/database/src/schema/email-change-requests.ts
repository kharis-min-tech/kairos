import { pgTable, uuid, varchar, timestamp, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { members } from './members';

/**
 * email_change_requests — pending or completed email-change flows.
 *
 * Status transitions:
 *   pending  → confirmed (user clicked confirmation link)
 *            → reverted  (user clicked "this wasn't me" on the old-email alert)
 *            → expired   (24h elapsed without action)
 *
 * confirmTokenHash / undoTokenHash are bcrypt-hashed; the raw tokens only
 * exist in the emails. Only one pending row per member at a time.
 */
export const emailChangeRequests = pgTable('email_change_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  oldEmail: varchar('old_email', { length: 200 }).notNull(),
  newEmail: varchar('new_email', { length: 200 }).notNull(),
  confirmTokenHash: varchar('confirm_token_hash', { length: 200 }).notNull(),
  undoTokenHash: varchar('undo_token_hash', { length: 200 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  expiresAt: timestamp('expires_at').notNull(),
  confirmedAt: timestamp('confirmed_at'),
  revertedAt: timestamp('reverted_at'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_email_change_requests_pending_member')
    .on(table.memberId)
    .where(sql`status = 'pending' AND is_active = true`),
  index('idx_email_change_requests_status').on(table.status),
  index('idx_email_change_requests_expires').on(table.expiresAt),
]);

export const emailChangeRequestsRelations = relations(emailChangeRequests, ({ one }) => ({
  member: one(members, { fields: [emailChangeRequests.memberId], references: [members.id] }),
}));

export type EmailChangeRequest = typeof emailChangeRequests.$inferSelect;
export type NewEmailChangeRequest = typeof emailChangeRequests.$inferInsert;

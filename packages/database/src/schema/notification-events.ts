import { pgTable, uuid, varchar, jsonb, timestamp, boolean, text, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { members } from './members';
import { branches } from './branches';

/**
 * notification_events — outbound log keyed on the recipient.
 *
 * Every dispatch — immediate or queued — writes a row. For immediate sends
 * sent_at is stamped at dispatch time. For digest-cadence categories sent_at
 * is NULL until the daily cron rolls the row into a digest batch.
 *
 * Purpose: digest aggregation, audit, debugging.
 */
export const notificationEvents = pgTable('notification_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 50 }).notNull(),
  eventType: varchar('event_type', { length: 80 }).notNull(),
  subjectType: varchar('subject_type', { length: 50 }),
  subjectId: uuid('subject_id'),
  payload: jsonb('payload').notNull(),
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),
  sentAt: timestamp('sent_at'),
  batchId: uuid('batch_id'),
  sendError: text('send_error'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('idx_notification_events_member_sent').on(table.memberId, table.sentAt),
  index('idx_notification_events_digest_pending')
    .on(table.memberId, table.category)
    .where(sql`sent_at IS NULL AND is_active = true`),
  index('idx_notification_events_event_type').on(table.eventType),
]);

export const notificationEventsRelations = relations(notificationEvents, ({ one }) => ({
  member: one(members, { fields: [notificationEvents.memberId], references: [members.id] }),
  branch: one(branches, { fields: [notificationEvents.branchId], references: [branches.id] }),
}));

export type NotificationEvent = typeof notificationEvents.$inferSelect;
export type NewNotificationEvent = typeof notificationEvents.$inferInsert;

import { pgTable, uuid, varchar, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { members } from './members';

/**
 * notification_preferences — one row per (member, category) overriding defaults.
 *
 * Absence of a row means "use the default for this category" (defined in code,
 * not in the DB). The `security` category is always treated as enabled
 * regardless of any row that may exist; the API/UI prevents users from
 * disabling security alerts.
 */
export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 50 }).notNull(),
  enabled: boolean('enabled').notNull().default(true),
  cadence: varchar('cadence', { length: 20 }).notNull().default('immediate'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_notification_preferences_member_category')
    .on(table.memberId, table.category)
    .where(sql`is_active = true`),
]);

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  member: one(members, { fields: [notificationPreferences.memberId], references: [members.id] }),
}));

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;

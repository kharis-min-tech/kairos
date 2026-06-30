import { pgTable, uuid, varchar, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { members } from './members';

/**
 * consent_records — one immutable row per (member × type × version × grant).
 *
 * Consent types (Phase 3): 'terms', 'privacy', 'marketing'.
 * Version is set from env vars (CONSENT_VERSION_*) so we can bump the prompt
 * without touching the DB. The latest active row per (member, type) is the
 * current state; older rows are history.
 *
 * A unique partial index ensures one active row per (member, type, version),
 * so re-accepting the same version is a no-op.
 */
export const consentRecords = pgTable('consent_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  consentType: varchar('consent_type', { length: 30 }).notNull(),
  version: varchar('version', { length: 20 }).notNull(),
  granted: boolean('granted').notNull(),
  grantedAt: timestamp('granted_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_consent_records_member_type_version')
    .on(table.memberId, table.consentType, table.version)
    .where(sql`is_active = true`),
  index('idx_consent_records_member_type').on(table.memberId, table.consentType),
]);

export const consentRecordsRelations = relations(consentRecords, ({ one }) => ({
  member: one(members, { fields: [consentRecords.memberId], references: [members.id] }),
}));

export type ConsentRecord = typeof consentRecords.$inferSelect;
export type NewConsentRecord = typeof consentRecords.$inferInsert;

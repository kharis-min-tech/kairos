import { pgTable, uuid, varchar, jsonb, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { members } from './members';

/**
 * audit_log — security-relevant event capture.
 *
 * Action set (Phase 2):
 *   - signin_success / signin_failure
 *   - password_change
 *   - email_change_requested / email_change_confirmed / email_change_reverted (Phase 3)
 *   - role_granted / role_revoked
 *
 * actorMemberId is nullable so we can record sign-in failures for an email
 * that doesn't match any account (attemptedEmail captures the input). For
 * member-known events actorMemberId is always set.
 */
export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorMemberId: uuid('actor_member_id').references(() => members.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 50 }).notNull(),
  outcome: varchar('outcome', { length: 20 }).notNull(),
  targetType: varchar('target_type', { length: 50 }),
  targetId: uuid('target_id'),
  ip: varchar('ip', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  country: varchar('country', { length: 2 }),
  attemptedEmail: varchar('attempted_email', { length: 200 }),
  metadata: jsonb('metadata'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('idx_audit_log_actor_created').on(table.actorMemberId, table.createdAt),
  index('idx_audit_log_action').on(table.action),
]);

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  actor: one(members, { fields: [auditLog.actorMemberId], references: [members.id] }),
}));

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;

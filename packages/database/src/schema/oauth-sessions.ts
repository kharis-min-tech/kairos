import { pgTable, uuid, varchar, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { members } from './members';

/**
 * oauth_sessions — Better-Auth default session-store shape.
 *
 * Present so Phase 2 can flip Better-Auth's session strategy from JWT-only
 * to server-backed sessions without another migration. Unused in Phase 1 —
 * Phase 1 continues to issue JWTs through the existing auth service.
 *
 * sessionToken is the opaque session identifier (hashed if we adopt the
 * hashed-token pattern in Phase 2). Cleanup of expired rows is a cron
 * responsibility once sessions become active.
 */
export const oauthSessions = pgTable('oauth_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ip: varchar('ip', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('idx_oauth_sessions_member').on(table.memberId),
  index('idx_oauth_sessions_token').on(table.sessionToken),
  index('idx_oauth_sessions_expires').on(table.expiresAt),
]);

export const oauthSessionsRelations = relations(oauthSessions, ({ one }) => ({
  member: one(members, { fields: [oauthSessions.memberId], references: [members.id] }),
}));

export type OAuthSession = typeof oauthSessions.$inferSelect;
export type NewOAuthSession = typeof oauthSessions.$inferInsert;

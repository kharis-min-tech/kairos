import { pgTable, uuid, varchar, boolean, timestamp, text, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { members } from './members';

/**
 * oauth_accounts — provider linkages for Better-Auth SSO (Phase 1).
 *
 * One row per (member × provider) link. `providerUserId` is the `sub` claim
 * returned by the IdP's ID token — the stable identifier we rely on for
 * repeat sign-ins (email can change, sub cannot).
 *
 * `providerEmail` / `providerEmailVerified` snapshot what the provider sent
 * at link time; used for the unverified-email collision check flow. Apple's
 * private-relay may omit these, hence nullable.
 *
 * accessToken / refreshToken / accessTokenExpiresAt / scope are unused in
 * Phase 1 (we don't call provider APIs beyond ID-token validation), but the
 * columns exist now so a future refresh-flow phase doesn't need a migration.
 *
 * Soft delete (isActive = false) = user has disconnected the provider.
 * The unique index on (provider, providerUserId) is partial on isActive so
 * a disconnected link can be re-established later without collision.
 */
export const oauthAccounts = pgTable('oauth_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 20 }).notNull(),
  providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
  providerEmail: varchar('provider_email', { length: 255 }),
  providerEmailVerified: boolean('provider_email_verified').notNull().default(false),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  scope: varchar('scope', { length: 500 }),
  connectedAt: timestamp('connected_at').notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_oauth_accounts_provider_sub_active')
    .on(table.provider, table.providerUserId)
    .where(sql`is_active = true`),
  index('idx_oauth_accounts_member').on(table.memberId),
  index('idx_oauth_accounts_provider_email').on(table.providerEmail),
]);

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  member: one(members, { fields: [oauthAccounts.memberId], references: [members.id] }),
}));

export type OAuthAccount = typeof oauthAccounts.$inferSelect;
export type NewOAuthAccount = typeof oauthAccounts.$inferInsert;

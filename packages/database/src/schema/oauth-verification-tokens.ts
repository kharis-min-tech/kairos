import { pgTable, uuid, varchar, jsonb, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * oauth_verification_tokens — Better-Auth default verification-token shape.
 *
 * Used for short-lived tokens that gate multi-step OAuth flows:
 *   - kind = 'link_confirmation' — an unverified provider email collided with
 *     an existing account; token proves the user completed password confirmation
 *     before we auto-link the two.
 *   - kind = 'oauth_state' — optional server-side state/nonce persistence for
 *     the OAuth2 redirect handshake, if we don't want to rely on signed cookies
 *     alone.
 *
 * `token` is stored hashed (never the raw value the user sees). `identifier`
 * is the email or memberId depending on kind. `metadata` carries kind-specific
 * payload (e.g. the pending providerUserId + providerEmail for a link
 * confirmation).
 */
export const oauthVerificationTokens = pgTable('oauth_verification_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  kind: varchar('kind', { length: 30 }).notNull(),
  metadata: jsonb('metadata'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_oauth_verification_tokens_token').on(table.token),
  index('idx_oauth_verification_tokens_identifier_kind').on(table.identifier, table.kind),
  index('idx_oauth_verification_tokens_expires').on(table.expiresAt),
]);

export type OAuthVerificationToken = typeof oauthVerificationTokens.$inferSelect;
export type NewOAuthVerificationToken = typeof oauthVerificationTokens.$inferInsert;

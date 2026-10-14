import { pgTable, uuid, varchar, boolean, timestamp, text, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { members } from './members';

/**
 * The OAuth2 / OpenID Connect AUTHORIZATION SERVER tables (Better-Auth
 * Phase 2): Kairos as the identity provider other Kharis apps sign in with.
 *
 * Not to be confused with `oauth_accounts` / `oauth_sessions`, which are the
 * CLIENT side — Kairos signing members in through Google, Apple or Microsoft.
 *
 * Nothing secret is stored in the clear. Client secrets, authorization codes
 * and refresh tokens are all high-entropy random values, so a plain SHA-256 is
 * the right hash (a slow password hash would only add latency to every token
 * request); the database holds digests and the plaintext exists once, in the
 * response that created it.
 */

/** A registered application that may ask members to sign in with Kairos. */
export const oauthClients = pgTable('oauth_clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** The public identifier the client sends as `client_id`. */
  clientId: varchar('client_id', { length: 64 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  description: text('description'),
  logoUrl: varchar('logo_url', { length: 500 }),
  homepageUrl: varchar('homepage_url', { length: 500 }),
  privacyUrl: varchar('privacy_url', { length: 500 }),
  termsUrl: varchar('terms_url', { length: 500 }),
  /** 'confidential' holds a secret (server apps); 'public' relies on PKCE alone (mobile, SPA). */
  clientType: varchar('client_type', { length: 20 }).notNull(),
  secretHash: varchar('secret_hash', { length: 64 }),
  /** Rotation overlap: the old secret keeps working until this passes. */
  previousSecretHash: varchar('previous_secret_hash', { length: 64 }),
  previousSecretExpiresAt: timestamp('previous_secret_expires_at'),
  /** Matched EXACTLY, never by prefix or wildcard. */
  redirectUris: text('redirect_uris').array().notNull(),
  allowedScopes: text('allowed_scopes').array().notNull(),
  /** First-party apps skip the consent screen. */
  isTrusted: boolean('is_trusted').notNull().default(false),
  createdByMemberId: uuid('created_by_member_id').references(() => members.id, { onDelete: 'set null' }),
  lastUsedAt: timestamp('last_used_at'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/** One member's standing authorisation of one client. Revoking ends every token under it. */
export const oauthGrants = pgTable('oauth_grants', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => oauthClients.id, { onDelete: 'cascade' }),
  scopes: text('scopes').array().notNull(),
  lastUsedAt: timestamp('last_used_at'),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_oauth_grants_member_client_live')
    .on(table.memberId, table.clientId)
    .where(sql`revoked_at IS NULL`),
  index('idx_oauth_grants_member').on(table.memberId),
  index('idx_oauth_grants_client').on(table.clientId),
]);

/** Single-use, short-lived. Redeeming it twice revokes everything it produced. */
export const oauthAuthorizationCodes = pgTable('oauth_authorization_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  codeHash: varchar('code_hash', { length: 64 }).notNull().unique(),
  grantId: uuid('grant_id').notNull().references(() => oauthGrants.id, { onDelete: 'cascade' }),
  redirectUri: varchar('redirect_uri', { length: 1000 }).notNull(),
  scopes: text('scopes').array().notNull(),
  codeChallenge: varchar('code_challenge', { length: 128 }).notNull(),
  nonce: varchar('nonce', { length: 255 }),
  expiresAt: timestamp('expires_at').notNull(),
  consumedAt: timestamp('consumed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('idx_oauth_codes_grant').on(table.grantId),
  index('idx_oauth_codes_expires').on(table.expiresAt),
]);

/**
 * Rotating refresh tokens. A `familyId` ties together every token descended
 * from one code exchange: using an already-rotated token means it leaked, so
 * the whole family is revoked. `familyExpiresAt` is the absolute cap that
 * rotation does not extend; `expiresAt` is the idle window.
 */
export const oauthRefreshTokens = pgTable('oauth_refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  familyId: uuid('family_id').notNull(),
  grantId: uuid('grant_id').notNull().references(() => oauthGrants.id, { onDelete: 'cascade' }),
  scopes: text('scopes').array().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  familyExpiresAt: timestamp('family_expires_at').notNull(),
  rotatedAt: timestamp('rotated_at'),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('idx_oauth_refresh_family').on(table.familyId),
  index('idx_oauth_refresh_grant').on(table.grantId),
]);

export const oauthClientsRelations = relations(oauthClients, ({ many }) => ({
  grants: many(oauthGrants),
}));

export const oauthGrantsRelations = relations(oauthGrants, ({ one }) => ({
  member: one(members, { fields: [oauthGrants.memberId], references: [members.id] }),
  client: one(oauthClients, { fields: [oauthGrants.clientId], references: [oauthClients.id] }),
}));

export type OAuthClient = typeof oauthClients.$inferSelect;
export type NewOAuthClient = typeof oauthClients.$inferInsert;
export type OAuthGrant = typeof oauthGrants.$inferSelect;
export type OAuthAuthorizationCode = typeof oauthAuthorizationCodes.$inferSelect;
export type OAuthRefreshToken = typeof oauthRefreshTokens.$inferSelect;

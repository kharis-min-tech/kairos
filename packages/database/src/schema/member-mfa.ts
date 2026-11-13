import { pgTable, uuid, varchar, text, integer, bigint, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { members } from './members';

/**
 * member_mfa — the TOTP second factor for privileged accounts.
 *
 * Its own table rather than columns on `members`, because `login()` and
 * `refreshAccessToken()` both select the whole member row. A secret on
 * `members` would be read into memory on every token refresh and carried by
 * every helper that passes a member row around. A TOTP secret is symmetric
 * and cannot be hashed the way a password can, so whoever reads it can mint
 * codes forever; it belongs in a row nothing touches by accident.
 */
export const memberMfa = pgTable('member_mfa', {
  memberId: uuid('member_id')
    .primaryKey()
    .references(() => members.id, { onDelete: 'cascade' }),
  /** AES-256-GCM ciphertext, base64. The key lives in MFA_ENCRYPTION_KEY, never here. */
  secretCiphertext: text('secret_ciphertext').notNull(),
  /** Per-row IV, base64. Public by design; it must simply never repeat under one key. */
  secretIv: varchar('secret_iv', { length: 32 }).notNull(),
  /**
   * Null means enrolment started and was never finished. Such a row is NOT a
   * second factor: the member scanned a QR code but never proved the
   * authenticator works, and enforcing against it would lock them out.
   */
  confirmedAt: timestamp('confirmed_at'),
  /** Highest step already accepted, so a code cannot be replayed inside its window. */
  lastUsedStep: bigint('last_used_step', { mode: 'number' }),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Backup codes, for the lost or replaced phone.
 *
 * SHA-256 rather than argon2id: a code here is 50 bits of randomness, so
 * there is no dictionary for key stretching to defend against, and hashing
 * cheaply keeps the lookup an indexed equality match instead of an
 * argon2id comparison against every unused row inside a Worker CPU budget.
 */
export const memberMfaBackupCodes = pgTable('member_mfa_backup_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  codeHash: varchar('code_hash', { length: 64 }).notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('idx_member_mfa_backup_codes_member').on(table.memberId),
  uniqueIndex('idx_member_mfa_backup_codes_lookup').on(table.memberId, table.codeHash),
]);

export const memberMfaRelations = relations(memberMfa, ({ one }) => ({
  member: one(members, { fields: [memberMfa.memberId], references: [members.id] }),
}));

export const memberMfaBackupCodesRelations = relations(memberMfaBackupCodes, ({ one }) => ({
  member: one(members, { fields: [memberMfaBackupCodes.memberId], references: [members.id] }),
}));

export type MemberMfa = typeof memberMfa.$inferSelect;
export type NewMemberMfa = typeof memberMfa.$inferInsert;
export type MemberMfaBackupCode = typeof memberMfaBackupCodes.$inferSelect;
export type NewMemberMfaBackupCode = typeof memberMfaBackupCodes.$inferInsert;

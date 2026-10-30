import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { branches } from './branches';
import { members } from './members';

/**
 * gift_aid_declarations — the auditable record of each Gift Aid declaration.
 *
 * Append-mostly. A withdrawal UPDATEs the row's cancellation columns; nothing
 * in the application deletes a row, and `is_active` exists only to satisfy the
 * repo-wide soft-delete convention (it is never flipped by the Gift Aid
 * service). HMRC can ask to see any declaration a claim rested on, and the
 * charity repays the tax, with interest, if it cannot produce one.
 *
 * Three decisions worth not re-litigating:
 *
 * 1. NOT `consent_records`. That table is (member x type x version) with a
 *    boolean, cascade-deleted with the member, and carries no payload. A
 *    declaration needs an address, a coverage scope, the exact wording agreed
 *    to, and evidence — and it must SURVIVE erasure. Consent version-bump
 *    semantics would also be wrong here: re-wording the declaration does not
 *    invalidate an existing one, so a bump must never re-prompt a donor.
 *
 * 2. The declarant's name and address are stored HERE, not read through to
 *    `members`. `deleteMyAccount` scrubs `first_name`, `last_name`, `address`
 *    and `postal_code` on the member row; a declaration that pointed at them
 *    would lose its HMRC evidence the moment a donor exercised erasure.
 *    `member_id` is therefore a LINK, not the source of the donor identity,
 *    and FK deletion is restricted rather than cascading.
 *
 * 3. `member_id` is nullable, and `branch_id` with it. The pre-rollout public
 *    form captures declarations from people who have no Kairos account yet;
 *    those are in force the moment they are made, and sit UNMATCHED until an
 *    admin links them — being unmatched is not a status. Same
 *    shape as the membership interest pool: captured first, admitted later.
 *    `branch_id` is a query handle for the admin queue (the branch the donor
 *    named, or their home branch once matched) and is NOT the declaration's
 *    reach — the declaration names the charity, which contains every branch.
 */
export const giftAidDeclarations = pgTable('gift_aid_declarations', {
  id: uuid('id').defaultRandom().primaryKey(),

  // ── Link (not identity) ──
  memberId: uuid('member_id').references(() => members.id, { onDelete: 'restrict' }),
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),

  // ── Declared identity — HMRC's required donor details ──
  // Title and name are sized to the Charities Online schedule columns (4 and
  // 35 characters) so a declaration can never be captured in a shape that
  // cannot be entered on a claim.
  title: varchar('title', { length: 4 }),
  firstName: varchar('first_name', { length: 35 }).notNull(),
  lastName: varchar('last_name', { length: 35 }).notNull(),
  /** House name or number first — it is the part HMRC actually matches on. */
  addressLine1: varchar('address_line1', { length: 200 }).notNull(),
  addressLine2: varchar('address_line2', { length: 200 }),
  city: varchar('city', { length: 100 }),
  /** Null only for overseas donors, who give a full address instead. */
  postcode: varchar('postcode', { length: 10 }),
  countryCode: varchar('country_code', { length: 2 }).notNull().default('GB'),
  email: varchar('email', { length: 100 }),
  phone: varchar('phone', { length: 20 }),

  // ── What it covers ──
  coverage: varchar('coverage', { length: 20 }).notNull().default('past_and_future'),
  /** Earliest donation date covered. Set for backdated coverage only. */
  coversFrom: date('covers_from'),
  singleGiftDescription: varchar('single_gift_description', { length: 200 }),

  // ── Evidence (HMRC 3.7.2: a database flag is not a record) ──
  channel: varchar('channel', { length: 20 }).notNull(),
  wordingVersion: varchar('wording_version', { length: 20 }).notNull(),
  /** The exact text the donor agreed to, as rendered at capture time. */
  declarationText: text('declaration_text').notNull(),
  /** Scan of a paper form, or the generated PDF of an online submission. */
  evidenceUrl: text('evidence_url'),
  /** Captured for online submissions, as corroborating evidence of the act. */
  sourceIp: varchar('source_ip', { length: 45 }),
  userAgent: text('user_agent'),
  /**
   * Date a verbal declaration's written confirmation was sent. The
   * declaration is not effective until it is, and the donor has 30 days from
   * it in which cancellation is RETROSPECTIVE. Verbal capture has no UI yet;
   * the column exists so the channel is not a lie when it does.
   */
  writtenConfirmationSentAt: timestamp('written_confirmation_sent_at'),

  /** When the donor made the declaration, which is not always when we typed it. */
  declaredAt: timestamp('declared_at').notNull().defaultNow(),
  /** Null for self-service; the admin who keyed a paper or verbal one otherwise. */
  capturedById: uuid('captured_by_id').references((): AnyPgColumn => members.id, {
    onDelete: 'set null',
  }),

  // ── Lifecycle ──
  /**
   * In force as a tax document, or not. Being unmatched to a member is NOT a
   * status — that is `member_id IS NULL`, a separate axis.
   */
  status: varchar('status', { length: 20 }).notNull().default('active'),
  /**
   * Withdrawal. Prospective: Gift Aid stops on gifts made from this date, and
   * claims already made stand. HMRC requires both the date and the method.
   */
  cancelledAt: timestamp('cancelled_at'),
  cancellationMethod: varchar('cancellation_method', { length: 20 }),
  cancellationNotes: text('cancellation_notes'),
  cancelledById: uuid('cancelled_by_id').references((): AnyPgColumn => members.id, {
    onDelete: 'set null',
  }),
  /** Set when a donor replaces this declaration with a new one. */
  supersededById: uuid('superseded_by_id').references((): AnyPgColumn => giftAidDeclarations.id, {
    onDelete: 'set null',
  }),
  /**
   * The date a human may review this record for destruction: six years after
   * the end of the accounting period containing the last covered donation.
   * Deliberately NOT actioned by a cron — an open HMRC enquiry extends it
   * indefinitely, and no scheduled job can know about one.
   */
  retentionReviewAt: timestamp('retention_review_at'),

  // Repo convention. The Gift Aid service never sets this false: a tax record
  // is not soft-deletable.
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  // One declaration in force per member. Partial, so withdrawn and
  // superseded rows accumulate freely beneath it.
  uniqueIndex('uq_gift_aid_active_per_member')
    .on(table.memberId)
    .where(sql`status = 'active' AND member_id IS NOT NULL`),
  index('idx_gift_aid_member').on(table.memberId),
  index('idx_gift_aid_branch').on(table.branchId),
  index('idx_gift_aid_status_declared').on(table.status, table.declaredAt.desc()),
  // The match queue reads by email, and the register export by postcode.
  index('idx_gift_aid_email').on(table.email),
  index('idx_gift_aid_postcode').on(table.postcode),
]);

export const giftAidDeclarationsRelations = relations(giftAidDeclarations, ({ one }) => ({
  member: one(members, {
    fields: [giftAidDeclarations.memberId],
    references: [members.id],
    relationName: 'giftAidDonor',
  }),
  branch: one(branches, {
    fields: [giftAidDeclarations.branchId],
    references: [branches.id],
  }),
  capturedBy: one(members, {
    fields: [giftAidDeclarations.capturedById],
    references: [members.id],
    relationName: 'giftAidCapturedBy',
  }),
}));

export type GiftAidDeclarationRow = typeof giftAidDeclarations.$inferSelect;
export type NewGiftAidDeclarationRow = typeof giftAidDeclarations.$inferInsert;

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  decimal,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { members } from './members';
import { branches } from './branches';

// ============================================================================
// DONATIONS
// Purpose: Store member donation/giving records
// ============================================================================
export const donations = pgTable(
  'donations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    memberId: uuid('member_id').references(() => members.id, {
      onDelete: 'restrict',
    }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    donationDate: date('donation_date').notNull().default(sql`CURRENT_DATE`),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('GBP'),
    donationPurpose: varchar('donation_purpose', { length: 30 }).notNull(),
    description: text('description'),
    paymentMethod: varchar('payment_method', { length: 30 }),
    referenceNumber: varchar('reference_number', { length: 100 }),
    stripePaymentId: varchar('stripe_payment_id', { length: 255 }),
    status: varchar('status', { length: 20 }).default('completed'),
    isAnonymous: boolean('is_anonymous').default(false),
    notes: text('notes'),
    recordedBy: uuid('recorded_by').references(() => members.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_donations_member_id').on(table.memberId),
    index('idx_donations_branch_id').on(table.branchId),
    index('idx_donations_donation_date').on(table.donationDate),
    index('idx_donations_purpose').on(table.donationPurpose),
    check('chk_donations_amount', sql`${table.amount} > 0`),
    index('idx_donations_stripe_payment_id').on(table.stripePaymentId),
    check(
      'chk_donations_purpose',
      sql`${table.donationPurpose} IN ('Offering', 'Tithe', 'Building Fund', 'Other')`
    ),
    check(
      'chk_donations_payment_method',
      sql`${table.paymentMethod} IS NULL OR ${table.paymentMethod} IN ('Cash', 'Check', 'Bank Transfer', 'Mobile Money', 'Card', 'Online', 'Other')`
    ),
    check(
      'chk_donations_description',
      sql`(${table.donationPurpose} != 'Other') OR (${table.donationPurpose} = 'Other' AND ${table.description} IS NOT NULL AND ${table.description} != '')`
    ),
  ]
);

// ── Relations ──────────────────────────────────────────────

export const donationsRelations = relations(donations, ({ one }) => ({
  member: one(members, { fields: [donations.memberId], references: [members.id] }),
  branch: one(branches, { fields: [donations.branchId], references: [branches.id] }),
  recordedByMember: one(members, { fields: [donations.recordedBy], references: [members.id], relationName: 'recordedDonations' }),
}));


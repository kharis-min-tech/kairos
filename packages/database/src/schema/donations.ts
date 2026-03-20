import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  date,
  decimal,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { branches, members } from './core';

// ============================================================================
// DONATIONS
// Purpose: Store member donation/giving records
// ============================================================================
export const donations = pgTable(
  'donations',
  {
    donationId: serial('donation_id').primaryKey(),
    memberId: integer('member_id').references(() => members.memberId, {
      onDelete: 'restrict',
    }),
    branchId: integer('branch_id')
      .notNull()
      .references(() => branches.branchId, { onDelete: 'restrict' }),
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
    recordedBy: integer('recorded_by').references(() => members.memberId, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
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

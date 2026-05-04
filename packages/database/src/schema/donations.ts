import { pgTable, uuid, numeric, varchar, boolean, text, timestamp, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { members } from './members';
import { branches } from './branches';

export const donations = pgTable('donations', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').references(() => members.id, { onDelete: 'set null' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('GBP'),
  donationPurpose: varchar('donation_purpose', { length: 50 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
  donationDate: date('donation_date').notNull(),
  isAnonymous: boolean('is_anonymous').notNull().default(false),
  description: text('description'),
  recordedBy: uuid('recorded_by').references(() => members.id, { onDelete: 'set null' }),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const donationsRelations = relations(donations, ({ one }) => ({
  member: one(members, {
    fields: [donations.memberId],
    references: [members.id],
  }),
  branch: one(branches, {
    fields: [donations.branchId],
    references: [branches.id],
  }),
  recordedByMember: one(members, {
    fields: [donations.recordedBy],
    references: [members.id],
    relationName: 'recordedDonations',
  }),
}));

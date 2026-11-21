import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  date,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { branches } from './branches';

/**
 * pilot_interest — a branch putting itself forward to go first.
 *
 * The rollout plan asks every branch pastor and branch leader which branch
 * wants to be the pilot, and says the time cost belongs in the announcement
 * rather than in a later conversation: "a branch that volunteers on
 * enthusiasm alone and then meets the daily approval queue will sour by the
 * third week". This table is that announcement's reply slip, and most of its
 * columns exist so the choice can be made from what the plan says to look
 * for rather than from who answered most eagerly.
 *
 * Four decisions worth not re-litigating:
 *
 * 1. NOT `membership_interest`. That is a member asking to join a membership
 *    cohort. This is a branch leader volunteering a whole branch for a
 *    pilot. They share only the word "interest".
 *
 * 2. `branch_id` is nullable and `branch_name` is always written. The form is
 *    public and unauthenticated, so the person filling it in may name a
 *    branch that is not seeded yet, and the plan has seeding happen AFTER a
 *    branch is chosen. What they typed is the record; the foreign key is a
 *    convenience for the admin queue once it resolves.
 *
 * 3. `requirements_version` records which wording the commitments carried
 *    when this branch read them, so a later edit to the page cannot rewrite
 *    what somebody was shown. There are no per-commitment booleans: the page
 *    presents the commitments to be read, not ticked, and storing a tick
 *    would record a promise nobody is held to.
 *
 * 4. No member link, and no cascade anywhere. Whoever fills this in has no
 *    Kairos account yet -- the plan has members signing themselves up only
 *    after a branch is chosen and seeded. The row is evidence of an offer and
 *    must outlive any account later created for the same person.
 */
export const pilotInterest = pgTable(
  'pilot_interest',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // ── Who is offering ──
    fullName: varchar('full_name', { length: 200 }).notNull(),
    /** 'branch_pastor' | 'branch_leader' | 'other'. Free text when 'other'. */
    roleAtBranch: varchar('role_at_branch', { length: 40 }).notNull(),
    roleOther: varchar('role_other', { length: 120 }),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 40 }),

    // ── Which branch ──
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    branchName: varchar('branch_name', { length: 200 }).notNull(),
    /**
     * Counts, not size. The plan is explicit that it is not optimising for
     * size in either direction: it wants "a normal mix of fellowships and
     * departments, so the pilot exercises the parts every other branch will
     * use". A branch with one of each exercises nothing.
     */
    fellowshipCount: integer('fellowship_count'),
    departmentCount: integer('department_count'),
    approxMembers: integer('approx_members'),

    // ── Readiness, in the plan's own terms ──
    /** "Someone available to act as head of admin, with their account set up
     *  before members start signing up." */
    headOfAdminName: varchar('head_of_admin_name', { length: 200 }),
    headOfAdminEmail: varchar('head_of_admin_email', { length: 255 }),
    /** "A safeguarding lead already in post." Already, not willing to find one. */
    safeguardingLeadInPost: boolean('safeguarding_lead_in_post').notNull().default(false),
    safeguardingLeadName: varchar('safeguarding_lead_name', { length: 200 }),
    /** Training runs in two rounds over one to two weeks; when could they start. */
    earliestStart: date('earliest_start'),

    // ── What they are taking on ──
    requirementsVersion: varchar('requirements_version', { length: 20 }).notNull(),

    // ── In their own words ──
    whyThisBranch: text('why_this_branch'),
    notes: text('notes'),

    // ── Triage ──
    /** 'new' | 'reviewing' | 'selected' | 'declined'. */
    status: varchar('status', { length: 20 }).notNull().default('new'),
    reviewNotes: text('review_notes'),

    // ── Provenance ──
    sourceIp: varchar('source_ip', { length: 64 }),
    userAgent: text('user_agent'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // The admin queue reads newest-first, filtered by status.
    statusSubmittedIdx: index('pilot_interest_status_submitted_idx').on(t.status, t.submittedAt),
    branchIdx: index('pilot_interest_branch_idx').on(t.branchId),
  }),
);

export const pilotInterestRelations = relations(pilotInterest, ({ one }) => ({
  branch: one(branches, {
    fields: [pilotInterest.branchId],
    references: [branches.id],
  }),
}));

export type PilotInterest = typeof pilotInterest.$inferSelect;
export type NewPilotInterest = typeof pilotInterest.$inferInsert;

import { pgTable, uuid, varchar, text, integer, date, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { fellowships } from './fellowships';
import { branchDepartments } from './branch-departments';
import { branches } from './branches';
import { members } from './members';

/**
 * Every follow-up whose subject is a member — pastoral, fellowship or
 * department. The souls pipeline keeps its own `follow_ups`, whose subject is
 * a soul and whose semantics are a conversion funnel rather than care.
 *
 * ## Context
 *
 * A follow-up declares the relationship it was made under, and the branch is
 * one of them. That matters two ways:
 *
 * 1. Before 0052 the container was the table — `fellowship_followups` and
 *    `department_followups` both had a NOT NULL container — so a person in no
 *    fellowship and no department could not be followed up at all. An invited
 *    first-timer (minted as a `visitor` member by the first-timer form) and an
 *    ordinary member in no group had nowhere for the record to live, and so no
 *    route into the welfare / safeguarding inboxes either.
 *
 * 2. "No container" is NOT modelled as an absence. A nullable container is
 *    something a bad write falls into, which would let a fellowship follow-up
 *    silently become a branch one. `contextKind` is NOT NULL and the CHECK
 *    below ties it to exactly one id, so branch is a deliberate choice.
 *
 * Context is declared by the caller and validated server-side; it is never
 * inferred from the subject's memberships. A member of both a fellowship and a
 * department has two genuinely different follow-up relationships — their
 * fellowship leader checking on them pastorally, their department lead on
 * their serving — and guessing between them would attribute the record, and
 * its visibility, to the wrong people.
 */
export const memberFollowups = pgTable('member_followups', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** Always set. Scopes every read, and IS the context when kind = 'branch'. */
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  /** 'fellowship' | 'department' | 'branch' — see the CHECK below. */
  contextKind: varchar('context_kind', { length: 20 }).notNull(),
  fellowshipId: uuid('fellowship_id').references(() => fellowships.id, { onDelete: 'cascade' }),
  departmentId: uuid('department_id').references(() => branchDepartments.id, { onDelete: 'cascade' }),
  /** The subject — who the follow-up is about. */
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  recordedById: uuid('recorded_by_id').notNull().references(() => members.id, { onDelete: 'restrict' }),
  assignedToId: uuid('assigned_to_id').references(() => members.id, { onDelete: 'set null' }),
  contactedAt: timestamp('contacted_at').defaultNow().notNull(),
  // Legacy single-method + single-status kept for back-compat with rows
  // written before the visit-shape migration (0046). New rows always
  // populate `type` + `methods` + the type-specific fields below.
  contactMethod: varchar('contact_method', { length: 30 }).notNull(),
  contactStatus: varchar('contact_status', { length: 30 }).notNull(),
  // 0046: follow-up type. `contact` = phone/text/whatsapp/email; `visit`
  // = in-person or virtual home visit. Drives which set of fields below
  // is meaningful.
  type: varchar('type', { length: 10 }).notNull().default('contact'),
  // Multi-method — a single follow-up can span more than one channel
  // (call + text after no-answer). jsonb array of method strings.
  methods: jsonb('methods'),
  // Contact-type fields
  contactReached: boolean('contact_reached'),
  interestLevel: varchar('interest_level', { length: 20 }),
  // Visit-type fields
  visitKind: varchar('visit_kind', { length: 20 }),
  visitAnnounced: boolean('visit_announced'),
  visitArrivalAt: timestamp('visit_arrival_at', { withTimezone: true }),
  visitDepartureAt: timestamp('visit_departure_at', { withTimezone: true }),
  visitOutcome: varchar('visit_outcome', { length: 20 }),
  companionMemberIds: jsonb('companion_member_ids'),
  // Orthogonal flags — surface in leader/safeguarding inboxes
  welfareConcern: boolean('welfare_concern').notNull().default(false),
  safeguardingConcern: boolean('safeguarding_concern').notNull().default(false),
  durationMinutes: integer('duration_minutes'),
  notes: text('notes'),
  nextFollowUpDate: date('next_follow_up_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_member_followups_branch_id').on(table.branchId),
  index('idx_member_followups_fellowship_id').on(table.fellowshipId),
  index('idx_member_followups_department_id').on(table.departmentId),
  index('idx_member_followups_context_kind').on(table.contextKind),
  index('idx_member_followups_member_id').on(table.memberId),
  index('idx_member_followups_contacted_at').on(table.contactedAt),
  index('idx_member_followups_contact_status').on(table.contactStatus),
  sql`CHECK (duration_minutes IS NULL OR duration_minutes > 0)`,
  sql`CHECK (type IN ('contact', 'visit'))`,
  sql`CHECK (interest_level IS NULL OR interest_level IN ('interested', 'not_interested', 'undecided'))`,
  sql`CHECK (visit_kind IS NULL OR visit_kind IN ('in_person', 'virtual'))`,
  sql`CHECK (visit_outcome IS NULL OR visit_outcome IN ('present', 'not_present', 'rescheduled'))`,
  // The guarantee: a context is always declared, and it always matches the id
  // that is set. 'branch' is a named choice, never a forgotten field.
  sql`CHECK (
    (context_kind = 'fellowship' AND fellowship_id IS NOT NULL AND department_id IS NULL)
    OR (context_kind = 'department' AND department_id IS NOT NULL AND fellowship_id IS NULL)
    OR (context_kind = 'branch' AND fellowship_id IS NULL AND department_id IS NULL)
  )`,
]);

export const memberFollowupsRelations = relations(memberFollowups, ({ one }) => ({
  branch: one(branches, { fields: [memberFollowups.branchId], references: [branches.id] }),
  fellowship: one(fellowships, { fields: [memberFollowups.fellowshipId], references: [fellowships.id] }),
  department: one(branchDepartments, { fields: [memberFollowups.departmentId], references: [branchDepartments.id] }),
  member: one(members, { fields: [memberFollowups.memberId], references: [members.id], relationName: 'memberFollowupSubject' }),
  recordedBy: one(members, { fields: [memberFollowups.recordedById], references: [members.id], relationName: 'memberFollowupRecorder' }),
  assignedTo: one(members, { fields: [memberFollowups.assignedToId], references: [members.id], relationName: 'memberFollowupAssignee' }),
}));

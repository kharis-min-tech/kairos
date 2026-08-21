import { pgTable, uuid, varchar, text, integer, date, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { fellowships } from './fellowships';
import { members } from './members';

export const fellowshipFollowups = pgTable('fellowship_followups', {
  id: uuid('id').defaultRandom().primaryKey(),
  fellowshipId: uuid('fellowship_id').notNull().references(() => fellowships.id, { onDelete: 'cascade' }),
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
  index('idx_fellowship_followups_fellowship_id').on(table.fellowshipId),
  index('idx_fellowship_followups_member_id').on(table.memberId),
  index('idx_fellowship_followups_contacted_at').on(table.contactedAt),
  index('idx_fellowship_followups_contact_status').on(table.contactStatus),
  sql`CHECK (duration_minutes IS NULL OR duration_minutes > 0)`,
  sql`CHECK (type IN ('contact', 'visit'))`,
  sql`CHECK (interest_level IS NULL OR interest_level IN ('interested', 'not_interested', 'undecided'))`,
  sql`CHECK (visit_kind IS NULL OR visit_kind IN ('in_person', 'virtual'))`,
  sql`CHECK (visit_outcome IS NULL OR visit_outcome IN ('present', 'not_present', 'rescheduled'))`,
]);

export const fellowshipFollowupsRelations = relations(fellowshipFollowups, ({ one }) => ({
  fellowship: one(fellowships, { fields: [fellowshipFollowups.fellowshipId], references: [fellowships.id] }),
  member: one(members, { fields: [fellowshipFollowups.memberId], references: [members.id], relationName: 'fellowshipFollowupSubject' }),
  recordedBy: one(members, { fields: [fellowshipFollowups.recordedById], references: [members.id], relationName: 'fellowshipFollowupRecorder' }),
  assignedTo: one(members, { fields: [fellowshipFollowups.assignedToId], references: [members.id], relationName: 'fellowshipFollowupAssignee' }),
}));

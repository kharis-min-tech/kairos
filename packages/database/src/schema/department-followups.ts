import { pgTable, uuid, varchar, text, integer, date, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { branchDepartments } from './branch-departments';
import { members } from './members';

export const departmentFollowups = pgTable('department_followups', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchDepartmentId: uuid('branch_department_id').notNull().references(() => branchDepartments.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  recordedById: uuid('recorded_by_id').notNull().references(() => members.id, { onDelete: 'restrict' }),
  assignedToId: uuid('assigned_to_id').references(() => members.id, { onDelete: 'set null' }),
  contactedAt: timestamp('contacted_at').defaultNow().notNull(),
  contactMethod: varchar('contact_method', { length: 30 }).notNull(),
  contactStatus: varchar('contact_status', { length: 30 }).notNull(),
  // 0046 visit-shape fields — see fellowship-followups.ts for the rationale.
  type: varchar('type', { length: 10 }).notNull().default('contact'),
  methods: jsonb('methods'),
  contactReached: boolean('contact_reached'),
  interestLevel: varchar('interest_level', { length: 20 }),
  visitKind: varchar('visit_kind', { length: 20 }),
  visitAnnounced: boolean('visit_announced'),
  visitArrivalAt: timestamp('visit_arrival_at', { withTimezone: true }),
  visitDepartureAt: timestamp('visit_departure_at', { withTimezone: true }),
  visitOutcome: varchar('visit_outcome', { length: 20 }),
  companionMemberIds: jsonb('companion_member_ids'),
  welfareConcern: boolean('welfare_concern').notNull().default(false),
  safeguardingConcern: boolean('safeguarding_concern').notNull().default(false),
  durationMinutes: integer('duration_minutes'),
  notes: text('notes'),
  nextFollowUpDate: date('next_follow_up_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_department_followups_branch_department_id').on(table.branchDepartmentId),
  index('idx_department_followups_member_id').on(table.memberId),
  index('idx_department_followups_contacted_at').on(table.contactedAt),
  index('idx_department_followups_contact_status').on(table.contactStatus),
  sql`CHECK (duration_minutes IS NULL OR duration_minutes > 0)`,
  sql`CHECK (type IN ('contact', 'visit'))`,
  sql`CHECK (interest_level IS NULL OR interest_level IN ('interested', 'not_interested', 'undecided'))`,
  sql`CHECK (visit_kind IS NULL OR visit_kind IN ('in_person', 'virtual'))`,
  sql`CHECK (visit_outcome IS NULL OR visit_outcome IN ('present', 'not_present', 'rescheduled'))`,
]);

export const departmentFollowupsRelations = relations(departmentFollowups, ({ one }) => ({
  branchDepartment: one(branchDepartments, { fields: [departmentFollowups.branchDepartmentId], references: [branchDepartments.id] }),
  member: one(members, { fields: [departmentFollowups.memberId], references: [members.id], relationName: 'followupSubject' }),
  recordedBy: one(members, { fields: [departmentFollowups.recordedById], references: [members.id], relationName: 'followupRecorder' }),
  assignedTo: one(members, { fields: [departmentFollowups.assignedToId], references: [members.id], relationName: 'followupAssignee' }),
}));

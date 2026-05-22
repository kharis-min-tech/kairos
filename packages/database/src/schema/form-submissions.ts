import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { branches } from './branches';
import { members } from './members';

export const formSubmissions = pgTable('form_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  formType: varchar('form_type', { length: 30 }).notNull(),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  submittedBy: uuid('submitted_by').notNull().references(() => members.id),
  subjectMemberId: uuid('subject_member_id').references(() => members.id),
  payload: jsonb('payload').notNull(),
  status: varchar('status', { length: 20 }).default('new').notNull(),
  linkedEntityType: varchar('linked_entity_type', { length: 50 }),
  linkedEntityId: uuid('linked_entity_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_form_submissions_type_branch_created')
    .on(table.formType, table.branchId, table.createdAt.desc()),
  index('idx_form_submissions_status').on(table.status),
  index('idx_form_submissions_subject_member_id').on(table.subjectMemberId),
  sql`CHECK (form_type IN ('altar_call', 'baptism', 'testimony', 'baby_naming', 'baby_dedication'))`,
  sql`CHECK (status IN ('new', 'reviewed', 'converted', 'dismissed'))`,
]);

export const formSubmissionsRelations = relations(formSubmissions, ({ one }) => ({
  branch: one(branches, { fields: [formSubmissions.branchId], references: [branches.id] }),
  submitter: one(members, {
    fields: [formSubmissions.submittedBy],
    references: [members.id],
    relationName: 'formSubmittedBy',
  }),
  subjectMember: one(members, {
    fields: [formSubmissions.subjectMemberId],
    references: [members.id],
    relationName: 'formSubjectMember',
  }),
}));

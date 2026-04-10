import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { members } from './members';
import { branches } from './branches';

// ============================================================================
// FORMS
// Purpose: Store form definitions for data collection
// ============================================================================
export const forms = pgTable(
  'forms',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    formName: varchar('form_name', { length: 200 }).notNull(),
    formDescription: text('form_description'),
    formDefinition: jsonb('form_definition').notNull(),
    scope: varchar('scope', { length: 30 }).notNull(),
    targetBranchId: uuid('target_branch_id').references(() => branches.id, {
      onDelete: 'cascade',
    }),
    isActive: boolean('is_active').default(true).notNull(),
    isTemplate: boolean('is_template').default(false).notNull(),
    createdBy: uuid('created_by').references(() => members.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_forms_scope').on(table.scope),
    index('idx_forms_target_branch_id').on(table.targetBranchId),
    index('idx_forms_is_active').on(table.isActive),
    index('idx_forms_created_by').on(table.createdBy),
    check(
      'chk_forms_scope',
      sql`${table.scope} IN ('Church-wide', 'Branch-specific')`
    ),
    check(
      'chk_forms_target_consistency',
      sql`(${table.scope} = 'Church-wide' AND ${table.targetBranchId} IS NULL) OR (${table.scope} = 'Branch-specific' AND ${table.targetBranchId} IS NOT NULL)`
    ),
  ]
);

// ============================================================================
// FORM_SUBMISSIONS
// Purpose: Store form submission data
// formId is nullable: pre-built forms (altar-call, etc.) may not have a form definition
// ============================================================================
export const formSubmissions = pgTable(
  'form_submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    formId: uuid('form_id').references(() => forms.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id').references(() => members.id, {
      onDelete: 'set null',
    }),
    submissionData: jsonb('submission_data').notNull(),
    submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_form_submissions_form_id').on(table.formId),
    index('idx_form_submissions_member_id').on(table.memberId),
    index('idx_form_submissions_submitted_at').on(table.submittedAt),
  ]
);

// ── Relations ──────────────────────────────────────────────

export const formsRelations = relations(forms, ({ one, many }) => ({
  targetBranch: one(branches, { fields: [forms.targetBranchId], references: [branches.id] }),
  createdByMember: one(members, { fields: [forms.createdBy], references: [members.id] }),
  submissions: many(formSubmissions),
}));

export const formSubmissionsRelations = relations(formSubmissions, ({ one }) => ({
  form: one(forms, { fields: [formSubmissions.formId], references: [forms.id] }),
  member: one(members, { fields: [formSubmissions.memberId], references: [members.id] }),
}));

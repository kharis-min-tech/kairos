import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { branches, members } from './core';

// ============================================================================
// FORMS
// Purpose: Store form definitions for data collection
// ============================================================================
export const forms = pgTable(
  'forms',
  {
    formId: serial('form_id').primaryKey(),
    formName: varchar('form_name', { length: 200 }).notNull(),
    formDescription: text('form_description'),
    formDefinition: jsonb('form_definition').notNull(),
    scope: varchar('scope', { length: 30 }).notNull(),
    targetBranchId: integer('target_branch_id').references(() => branches.branchId, {
      onDelete: 'cascade',
    }),
    isActive: boolean('is_active').default(true),
    isTemplate: boolean('is_template').default(false),
    createdBy: integer('created_by').references(() => members.memberId, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
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
// ============================================================================
export const formSubmissions = pgTable(
  'form_submissions',
  {
    submissionId: serial('submission_id').primaryKey(),
    formId: integer('form_id')
      .notNull()
      .references(() => forms.formId, { onDelete: 'cascade' }),
    memberId: integer('member_id').references(() => members.memberId, {
      onDelete: 'set null',
    }),
    submissionData: jsonb('submission_data').notNull(),
    submittedAt: timestamp('submitted_at').defaultNow(),
  },
  (table) => [
    index('idx_form_submissions_form_id').on(table.formId),
    index('idx_form_submissions_member_id').on(table.memberId),
    index('idx_form_submissions_submitted_at').on(table.submittedAt),
  ]
);

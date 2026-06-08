import { pgTable, uuid, varchar, text, date, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { branches } from './branches';
import { members } from './members';
import { outreachParticipants } from './outreach-participants';
import { souls } from './souls';
import { fellowships } from './fellowships';
import { branchDepartments } from './branch-departments';

export const outreachPrograms = pgTable('outreach_programs', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  programName: varchar('program_name', { length: 200 }).notNull(),
  programDate: date('program_date').notNull(),
  location: varchar('location', { length: 300 }).notNull(),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  description: text('description'),
  coordinatorId: uuid('coordinator_id').references(() => members.id, { onDelete: 'set null' }),
  coordinatorName: varchar('coordinator_name', { length: 200 }),
  createdBy: uuid('created_by').references(() => members.id, { onDelete: 'set null' }),
  // Optional attribution: this program is organized by / for a specific
  // fellowship or department. Used to scope souls into leader views.
  fellowshipId: uuid('fellowship_id').references(() => fellowships.id, { onDelete: 'set null' }),
  branchDepartmentId: uuid('branch_department_id').references(() => branchDepartments.id, { onDelete: 'set null' }),
  totalSoulsReached: integer('total_souls_reached').default(0).notNull(),
  notes: text('notes'),
  isCompleted: boolean('is_completed').default(false).notNull(),
  isOpenToAllBranches: boolean('is_open_to_all_branches').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  branchIdIdx: index('idx_outreach_programs_branch_id').on(table.branchId),
  coordinatorIdIdx: index('idx_outreach_programs_coordinator_id').on(table.coordinatorId),
  programDateIdx: index('idx_outreach_programs_program_date').on(table.programDate),
  isCompletedIdx: index('idx_outreach_programs_is_completed').on(table.isCompleted),
  fellowshipIdIdx: index('idx_outreach_programs_fellowship_id').on(table.fellowshipId),
  branchDepartmentIdIdx: index('idx_outreach_programs_branch_department_id').on(table.branchDepartmentId),
}));

export const outreachProgramsRelations = relations(outreachPrograms, ({ one, many }) => ({
  branch: one(branches, {
    fields: [outreachPrograms.branchId],
    references: [branches.id],
  }),
  coordinator: one(members, {
    fields: [outreachPrograms.coordinatorId],
    references: [members.id],
  }),
  participants: many(outreachParticipants),
  souls: many(souls),
}));

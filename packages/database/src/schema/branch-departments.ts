import { pgTable, uuid, text, date, boolean, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { branches } from './branches';
import { departments } from './departments';
import { members } from './members';
import { departmentMembers } from './department-members';
import { departmentJoinRequests } from './department-join-requests';
import { departmentFollowups } from './department-followups';
import { departmentUniformOutfits } from './department-uniform-outfits';
import { departmentUniformSchedule } from './department-uniform-schedule';
import { rotaTemplates } from './rota-templates';
import { rotaInstances } from './rota-instances';

export const branchDepartments = pgTable('branch_departments', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  departmentId: uuid('department_id').notNull().references(() => departments.id, { onDelete: 'restrict' }),
  leadMemberId: uuid('lead_member_id').references(() => members.id, { onDelete: 'set null' }),
  deputyMemberId: uuid('deputy_member_id').references(() => members.id, { onDelete: 'set null' }),
  description: text('description'),
  startDate: date('start_date').notNull().defaultNow(),
  endDate: date('end_date'),
  isActive: boolean('is_active').default(true).notNull(),
  probationDays: integer('probation_days').default(28).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_branch_departments_branch_id').on(table.branchId),
  index('idx_branch_departments_department_id').on(table.departmentId),
  index('idx_branch_departments_lead_member_id').on(table.leadMemberId),
  index('idx_branch_departments_is_active').on(table.isActive),
  uniqueIndex('uq_branch_departments_active')
    .on(table.branchId, table.departmentId)
    .where(sql`is_active = true`),
  sql`CHECK (lead_member_id IS NULL OR deputy_member_id IS NULL OR lead_member_id != deputy_member_id)`,
  sql`CHECK (end_date IS NULL OR end_date >= start_date)`,
]);

export const branchDepartmentsRelations = relations(branchDepartments, ({ one, many }) => ({
  branch: one(branches, { fields: [branchDepartments.branchId], references: [branches.id] }),
  department: one(departments, { fields: [branchDepartments.departmentId], references: [departments.id] }),
  lead: one(members, { fields: [branchDepartments.leadMemberId], references: [members.id], relationName: 'departmentLead' }),
  deputy: one(members, { fields: [branchDepartments.deputyMemberId], references: [members.id], relationName: 'departmentDeputy' }),
  members: many(departmentMembers),
  joinRequests: many(departmentJoinRequests),
  followups: many(departmentFollowups),
  uniformOutfits: many(departmentUniformOutfits),
  uniformSchedule: many(departmentUniformSchedule),
  rotaTemplates: many(rotaTemplates),
  rotaInstances: many(rotaInstances),
}));

import { pgTable, uuid, date, varchar, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { branchDepartments } from './branch-departments';
import { departmentUniformOutfits } from './department-uniform-outfits';
import { members } from './members';

export const departmentUniformSchedule = pgTable('department_uniform_schedule', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchDepartmentId: uuid('branch_department_id').notNull().references(() => branchDepartments.id, { onDelete: 'cascade' }),
  outfitId: uuid('outfit_id').notNull().references(() => departmentUniformOutfits.id, { onDelete: 'cascade' }),
  serviceDate: date('service_date').notNull(),
  genderTarget: varchar('gender_target', { length: 10 }).default('Unisex').notNull(),
  notes: text('notes'),
  assignedById: uuid('assigned_by_id').references(() => members.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_department_uniform_schedule_branch_department_id').on(table.branchDepartmentId),
  index('idx_department_uniform_schedule_service_date').on(table.serviceDate),
  uniqueIndex('uq_department_uniform_schedule_slot').on(table.branchDepartmentId, table.serviceDate, table.genderTarget),
  sql`CHECK (gender_target IN ('Male', 'Female', 'Unisex'))`,
]);

export const departmentUniformScheduleRelations = relations(departmentUniformSchedule, ({ one }) => ({
  branchDepartment: one(branchDepartments, { fields: [departmentUniformSchedule.branchDepartmentId], references: [branchDepartments.id] }),
  outfit: one(departmentUniformOutfits, { fields: [departmentUniformSchedule.outfitId], references: [departmentUniformOutfits.id] }),
  assignedBy: one(members, { fields: [departmentUniformSchedule.assignedById], references: [members.id] }),
}));

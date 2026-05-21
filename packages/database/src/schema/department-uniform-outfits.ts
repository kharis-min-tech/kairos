import { pgTable, uuid, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { branchDepartments } from './branch-departments';
import { members } from './members';
import { departmentUniformSchedule } from './department-uniform-schedule';

export const departmentUniformOutfits = pgTable('department_uniform_outfits', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchDepartmentId: uuid('branch_department_id').notNull().references(() => branchDepartments.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 150 }).notNull(),
  imageUrl: text('image_url').notNull(),
  genderTarget: varchar('gender_target', { length: 10 }).default('Unisex').notNull(),
  notes: text('notes'),
  isActive: boolean('is_active').default(true).notNull(),
  uploadedById: uuid('uploaded_by_id').references(() => members.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_department_uniform_outfits_branch_department_id').on(table.branchDepartmentId),
  index('idx_department_uniform_outfits_is_active').on(table.isActive),
  sql`CHECK (gender_target IN ('Male', 'Female', 'Unisex'))`,
]);

export const departmentUniformOutfitsRelations = relations(departmentUniformOutfits, ({ one, many }) => ({
  branchDepartment: one(branchDepartments, { fields: [departmentUniformOutfits.branchDepartmentId], references: [branchDepartments.id] }),
  uploadedBy: one(members, { fields: [departmentUniformOutfits.uploadedById], references: [members.id] }),
  schedule: many(departmentUniformSchedule),
}));

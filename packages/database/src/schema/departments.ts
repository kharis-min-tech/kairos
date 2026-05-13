import { pgTable, uuid, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { branchDepartments } from './branch-departments';

export const departments = pgTable('departments', {
  id: uuid('id').defaultRandom().primaryKey(),
  departmentName: varchar('department_name', { length: 100 }).notNull().unique(),
  description: text('description'),
  iconKey: varchar('icon_key', { length: 50 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_departments_is_active').on(table.isActive),
]);

export const departmentsRelations = relations(departments, ({ many }) => ({
  branchDepartments: many(branchDepartments),
}));

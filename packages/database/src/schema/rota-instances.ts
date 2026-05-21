import { pgTable, uuid, varchar, text, date, time, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { rotaTemplates } from './rota-templates';
import { branchDepartments } from './branch-departments';
import { rotaAssignments } from './rota-assignments';

export const rotaInstances = pgTable('rota_instances', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id').notNull().references(() => rotaTemplates.id, { onDelete: 'cascade' }),
  branchDepartmentId: uuid('branch_department_id').notNull().references(() => branchDepartments.id, { onDelete: 'cascade' }),
  serviceDate: date('service_date').notNull(),
  startTime: time('start_time'),
  status: varchar('status', { length: 20 }).default('Draft').notNull(),
  notes: text('notes'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_rota_instances_template_id').on(table.templateId),
  index('idx_rota_instances_branch_department_id').on(table.branchDepartmentId),
  index('idx_rota_instances_service_date').on(table.serviceDate),
  uniqueIndex('uq_rota_instances_template_date').on(table.templateId, table.serviceDate),
]);

export const rotaInstancesRelations = relations(rotaInstances, ({ one, many }) => ({
  template: one(rotaTemplates, { fields: [rotaInstances.templateId], references: [rotaTemplates.id] }),
  branchDepartment: one(branchDepartments, { fields: [rotaInstances.branchDepartmentId], references: [branchDepartments.id] }),
  assignments: many(rotaAssignments),
}));

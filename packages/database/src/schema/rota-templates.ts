import { pgTable, uuid, varchar, text, integer, time, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { branchDepartments } from './branch-departments';
import { rotaTemplateSlots } from './rota-template-slots';
import { rotaPoolMembers } from './rota-pool-members';
import { rotaInstances } from './rota-instances';

export const rotaTemplates = pgTable('rota_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchDepartmentId: uuid('branch_department_id').notNull().references(() => branchDepartments.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 150 }).notNull(),
  recurrence: varchar('recurrence', { length: 20 }).default('Weekly').notNull(),
  weekday: integer('weekday').notNull(),
  defaultStartTime: time('default_start_time'),
  notes: text('notes'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_rota_templates_branch_department_id').on(table.branchDepartmentId),
  index('idx_rota_templates_is_active').on(table.isActive),
  sql`CHECK (recurrence IN ('Weekly'))`,
  sql`CHECK (weekday BETWEEN 0 AND 6)`,
]);

export const rotaTemplatesRelations = relations(rotaTemplates, ({ one, many }) => ({
  branchDepartment: one(branchDepartments, { fields: [rotaTemplates.branchDepartmentId], references: [branchDepartments.id] }),
  slots: many(rotaTemplateSlots),
  pool: many(rotaPoolMembers),
  instances: many(rotaInstances),
}));

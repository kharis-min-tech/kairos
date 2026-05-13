import { pgTable, uuid, varchar, text, integer, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { rotaTemplates } from './rota-templates';

export const rotaTemplateSlots = pgTable('rota_template_slots', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id').notNull().references(() => rotaTemplates.id, { onDelete: 'cascade' }),
  roleName: varchar('role_name', { length: 100 }).notNull(),
  positionsRequired: integer('positions_required').default(1).notNull(),
  notes: text('notes'),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_rota_template_slots_template_id').on(table.templateId),
  uniqueIndex('uq_rota_template_slots_role').on(table.templateId, table.roleName),
  sql`CHECK (positions_required > 0)`,
]);

export const rotaTemplateSlotsRelations = relations(rotaTemplateSlots, ({ one }) => ({
  template: one(rotaTemplates, { fields: [rotaTemplateSlots.templateId], references: [rotaTemplates.id] }),
}));

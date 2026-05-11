import { pgTable, uuid, varchar, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { rotaInstances } from './rota-instances';
import { rotaTemplateSlots } from './rota-template-slots';
import { members } from './members';

export const rotaAssignments = pgTable('rota_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  instanceId: uuid('instance_id').notNull().references(() => rotaInstances.id, { onDelete: 'cascade' }),
  slotId: uuid('slot_id').notNull().references(() => rotaTemplateSlots.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').references(() => members.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).default('Assigned').notNull(),
  notes: text('notes'),
  respondedAt: timestamp('responded_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_rota_assignments_instance_id').on(table.instanceId),
  index('idx_rota_assignments_slot_id').on(table.slotId),
  index('idx_rota_assignments_member_id').on(table.memberId),
  index('idx_rota_assignments_status').on(table.status),
  uniqueIndex('uq_rota_assignments_member_per_instance')
    .on(table.instanceId, table.memberId)
    .where(sql`member_id IS NOT NULL`),
  sql`CHECK (status IN ('Assigned', 'Confirmed', 'Declined', 'Swapped', 'Open'))`,
]);

export const rotaAssignmentsRelations = relations(rotaAssignments, ({ one }) => ({
  instance: one(rotaInstances, { fields: [rotaAssignments.instanceId], references: [rotaInstances.id] }),
  slot: one(rotaTemplateSlots, { fields: [rotaAssignments.slotId], references: [rotaTemplateSlots.id] }),
  member: one(members, { fields: [rotaAssignments.memberId], references: [members.id] }),
}));

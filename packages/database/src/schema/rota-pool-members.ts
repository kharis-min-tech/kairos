import { pgTable, uuid, text, boolean, timestamp, date, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { rotaTemplates } from './rota-templates';
import { members } from './members';

export const rotaPoolMembers = pgTable('rota_pool_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id').notNull().references(() => rotaTemplates.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  preferredRoleName: text('preferred_role_name'),
  lastScheduledAt: date('last_scheduled_at'),
  isActive: boolean('is_active').default(true).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_rota_pool_members_template_id').on(table.templateId),
  index('idx_rota_pool_members_member_id').on(table.memberId),
  index('idx_rota_pool_members_is_active').on(table.isActive),
  uniqueIndex('uq_rota_pool_members_active')
    .on(table.templateId, table.memberId)
    .where(sql`is_active = true`),
]);

export const rotaPoolMembersRelations = relations(rotaPoolMembers, ({ one }) => ({
  template: one(rotaTemplates, { fields: [rotaPoolMembers.templateId], references: [rotaTemplates.id] }),
  member: one(members, { fields: [rotaPoolMembers.memberId], references: [members.id] }),
}));

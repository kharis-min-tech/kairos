import { pgTable, uuid, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { memberRoles } from './member-roles';

export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  roleName: varchar('role_name', { length: 100 }).notNull().unique(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_roles_is_active').on(table.isActive),
]);

export const rolesRelations = relations(roles, ({ many }) => ({
  memberRoles: many(memberRoles),
}));

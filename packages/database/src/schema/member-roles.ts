import { pgTable, uuid, date, varchar, boolean, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { members } from './members';
import { roles } from './roles';
import { branches } from './branches';

export const memberRoles = pgTable('member_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'restrict' }),
  // Parent branch — always populated, even for fellowship/department-scoped
  // grants. Used as a query index (e.g. "all grants in branch B").
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  // RBAC Phase 3: actual grant scope. Pair (scopeKind, scopeId) — for branch
  // grants scopeId equals branchId; for fellowship/department grants scopeId
  // is the fellowship.id / branch_department.id respectively.
  scopeKind: varchar('scope_kind', { length: 20 }).notNull(),
  scopeId: uuid('scope_id').notNull(),
  assignedDate: date('assigned_date').notNull().defaultNow(),
  endDate: date('end_date'),
  isActive: boolean('is_active').default(true).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_member_roles_member_id').on(table.memberId),
  index('idx_member_roles_role_id').on(table.roleId),
  index('idx_member_roles_branch_id').on(table.branchId),
  index('idx_member_roles_is_active').on(table.isActive),
  index('idx_member_roles_scope').on(table.scopeKind, table.scopeId),
  uniqueIndex('uq_member_roles_assignment').on(table.memberId, table.roleId, table.scopeKind, table.scopeId, table.assignedDate),
  uniqueIndex('uq_member_roles_active_assignment')
    .on(table.memberId, table.roleId, table.scopeKind, table.scopeId)
    .where(sql`is_active = true`),
  sql`CHECK (end_date IS NULL OR end_date >= assigned_date)`,
]);

export const memberRolesRelations = relations(memberRoles, ({ one }) => ({
  member: one(members, { fields: [memberRoles.memberId], references: [members.id] }),
  role: one(roles, { fields: [memberRoles.roleId], references: [roles.id] }),
  branch: one(branches, { fields: [memberRoles.branchId], references: [branches.id] }),
}));

import { pgTable, uuid, date, boolean, text, varchar, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { branchDepartments } from './branch-departments';
import { members } from './members';

export const departmentMembers = pgTable('department_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchDepartmentId: uuid('branch_department_id').notNull().references(() => branchDepartments.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  joinDate: date('join_date').notNull().defaultNow(),
  leaveDate: date('leave_date'),
  isActive: boolean('is_active').default(true).notNull(),
  membershipStatus: varchar('membership_status', { length: 20 }).default('active').notNull(),
  probationEndDate: date('probation_end_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_department_members_branch_department_id').on(table.branchDepartmentId),
  index('idx_department_members_member_id').on(table.memberId),
  index('idx_department_members_is_active').on(table.isActive),
  uniqueIndex('uq_department_members_assignment').on(table.branchDepartmentId, table.memberId, table.joinDate),
  sql`CHECK (leave_date IS NULL OR leave_date >= join_date)`,
  sql`CHECK (membership_status IN ('probation', 'active'))`,
]);

export const departmentMembersRelations = relations(departmentMembers, ({ one }) => ({
  branchDepartment: one(branchDepartments, { fields: [departmentMembers.branchDepartmentId], references: [branchDepartments.id] }),
  member: one(members, { fields: [departmentMembers.memberId], references: [members.id] }),
}));

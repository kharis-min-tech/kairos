import { pgTable, uuid, varchar, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { branchDepartments } from './branch-departments';
import { members } from './members';

export const departmentJoinRequests = pgTable('department_join_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchDepartmentId: uuid('branch_department_id').notNull().references(() => branchDepartments.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  notes: text('notes'),
  reviewedBy: uuid('reviewed_by').references(() => members.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at'),
  reviewNotes: text('review_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_department_join_requests_branch_department_id').on(table.branchDepartmentId),
  index('idx_department_join_requests_member_id').on(table.memberId),
  index('idx_department_join_requests_status').on(table.status),
  uniqueIndex('uq_department_join_requests_pending')
    .on(table.branchDepartmentId, table.memberId)
    .where(sql`status = 'pending'`),
  sql`CHECK (status IN ('pending', 'approved', 'rejected'))`,
]);

export const departmentJoinRequestsRelations = relations(departmentJoinRequests, ({ one }) => ({
  branchDepartment: one(branchDepartments, { fields: [departmentJoinRequests.branchDepartmentId], references: [branchDepartments.id] }),
  member: one(members, { fields: [departmentJoinRequests.memberId], references: [members.id] }),
  reviewer: one(members, { fields: [departmentJoinRequests.reviewedBy], references: [members.id] }),
}));

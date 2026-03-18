import { pgTable, uuid, varchar, date, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { branches } from './branches';
import { members } from './members';

export const branchLeadership = pgTable('branch_leadership', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'restrict' }),
  role: varchar('role', { length: 50 }).notNull(),
  startDate: date('start_date').notNull().defaultNow(),
  endDate: date('end_date'),
  isCurrent: boolean('is_current').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_branch_leadership_branch_id').on(table.branchId),
  index('idx_branch_leadership_member_id').on(table.memberId),
  index('idx_branch_leadership_is_current').on(table.isCurrent),
  uniqueIndex('uq_branch_leadership_assignment').on(table.branchId, table.memberId, table.role, table.startDate),
  uniqueIndex('idx_branch_leadership_current_pastor')
    .on(table.branchId)
    .where(sql`role = 'Main Pastor' AND is_current = TRUE`),
  uniqueIndex('idx_branch_leadership_current_member_role')
    .on(table.branchId, table.memberId, table.role)
    .where(sql`is_current = TRUE`),
  sql`CHECK (role IN ('Main Pastor', 'Elder'))`,
  sql`CHECK (end_date IS NULL OR end_date >= start_date)`,
]);

export const branchLeadershipRelations = relations(branchLeadership, ({ one }) => ({
  branch: one(branches, { fields: [branchLeadership.branchId], references: [branches.id] }),
  member: one(members, { fields: [branchLeadership.memberId], references: [members.id] }),
}));

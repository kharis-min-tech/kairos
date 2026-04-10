import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  index,
  unique,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { branches } from './branches';
import { members } from './members';

// ============================================================================
// DEPARTMENTS
// Purpose: Store department definitions (common across all branches)
// ============================================================================
export const departments = pgTable('departments', {
  id: uuid('id').defaultRandom().primaryKey(),
  departmentName: varchar('department_name', { length: 100 }).notNull().unique(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// BRANCH_DEPARTMENTS
// Purpose: Link departments to specific branches with leadership assignments
// ============================================================================
export const branchDepartments = pgTable(
  'branch_departments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    departmentId: uuid('department_id')
      .notNull()
      .references(() => departments.id, { onDelete: 'restrict' }),
    leadMemberId: uuid('lead_member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'restrict' }),
    deputyMemberId: uuid('deputy_member_id').references(() => members.id, {
      onDelete: 'set null',
    }),
    startDate: date('start_date').notNull().default(sql`CURRENT_DATE`),
    endDate: date('end_date'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_branch_departments_branch_id').on(table.branchId),
    index('idx_branch_departments_department_id').on(table.departmentId),
    index('idx_branch_departments_lead_member_id').on(table.leadMemberId),
    index('idx_branch_departments_is_active').on(table.isActive),
    uniqueIndex('idx_branch_departments_active')
      .on(table.branchId, table.departmentId)
      .where(sql`is_active = TRUE`),
    check(
      'chk_branch_departments_dates',
      sql`${table.endDate} IS NULL OR ${table.endDate} >= ${table.startDate}`
    ),
    check(
      'chk_branch_departments_leaders_different',
      sql`${table.deputyMemberId} IS NULL OR ${table.leadMemberId} != ${table.deputyMemberId}`
    ),
  ]
);

// ============================================================================
// DEPARTMENT_MEMBERS
// Purpose: Store member assignments to departments (many-to-many relationship)
// ============================================================================
export const departmentMembers = pgTable(
  'department_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    branchDepartmentId: uuid('branch_department_id')
      .notNull()
      .references(() => branchDepartments.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    joinDate: date('join_date').notNull().default(sql`CURRENT_DATE`),
    leaveDate: date('leave_date'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_department_members_branch_department_id').on(table.branchDepartmentId),
    index('idx_department_members_member_id').on(table.memberId),
    index('idx_department_members_is_active').on(table.isActive),
    unique('uq_department_members_assignment').on(
      table.branchDepartmentId,
      table.memberId,
      table.joinDate
    ),
    check(
      'chk_department_members_dates',
      sql`${table.leaveDate} IS NULL OR ${table.leaveDate} >= ${table.joinDate}`
    ),
  ]
);

// ── Relations ──────────────────────────────────────────────

export const departmentsRelations = relations(departments, ({ many }) => ({
  branchDepartments: many(branchDepartments),
}));

export const branchDepartmentsRelations = relations(branchDepartments, ({ one, many }) => ({
  branch: one(branches, { fields: [branchDepartments.branchId], references: [branches.id] }),
  department: one(departments, { fields: [branchDepartments.departmentId], references: [departments.id] }),
  leadMember: one(members, { fields: [branchDepartments.leadMemberId], references: [members.id], relationName: 'leadDepartments' }),
  deputyMember: one(members, { fields: [branchDepartments.deputyMemberId], references: [members.id], relationName: 'deputyDepartments' }),
  departmentMembers: many(departmentMembers),
}));

export const departmentMembersRelations = relations(departmentMembers, ({ one }) => ({
  branchDepartment: one(branchDepartments, { fields: [departmentMembers.branchDepartmentId], references: [branchDepartments.id] }),
  member: one(members, { fields: [departmentMembers.memberId], references: [members.id] }),
}));


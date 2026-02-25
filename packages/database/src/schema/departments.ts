import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  date,
  index,
  unique,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { branches } from './core';
import { members } from './core';

// ============================================================================
// DEPARTMENTS
// Purpose: Store department definitions (common across all branches)
// ============================================================================
export const departments = pgTable('departments', {
  departmentId: serial('department_id').primaryKey(),
  departmentName: varchar('department_name', { length: 100 }).notNull().unique(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================================
// BRANCH_DEPARTMENTS
// Purpose: Link departments to specific branches with leadership assignments
// ============================================================================
export const branchDepartments = pgTable(
  'branch_departments',
  {
    branchDepartmentId: serial('branch_department_id').primaryKey(),
    branchId: integer('branch_id')
      .notNull()
      .references(() => branches.branchId, { onDelete: 'cascade' }),
    departmentId: integer('department_id')
      .notNull()
      .references(() => departments.departmentId, { onDelete: 'restrict' }),
    leadMemberId: integer('lead_member_id')
      .notNull()
      .references(() => members.memberId, { onDelete: 'restrict' }),
    deputyMemberId: integer('deputy_member_id').references(() => members.memberId, {
      onDelete: 'restrict',
    }),
    startDate: date('start_date').notNull().default(sql`CURRENT_DATE`),
    endDate: date('end_date'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
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
    departmentMemberId: serial('department_member_id').primaryKey(),
    branchDepartmentId: integer('branch_department_id')
      .notNull()
      .references(() => branchDepartments.branchDepartmentId, { onDelete: 'cascade' }),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.memberId, { onDelete: 'cascade' }),
    joinDate: date('join_date').notNull().default(sql`CURRENT_DATE`),
    leaveDate: date('leave_date'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
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

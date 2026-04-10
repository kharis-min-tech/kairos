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

// ============================================================================
// REGIONS
// Purpose: Store geographical regions where branches are located
// ============================================================================
export const regions = pgTable('regions', {
  regionId: serial('region_id').primaryKey(),
  regionName: varchar('region_name', { length: 100 }).notNull().unique(),
  country: varchar('country', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================================
// BRANCHES
// Purpose: Store church branch information across different regions
// ============================================================================
export const branches = pgTable(
  'branches',
  {
    branchId: serial('branch_id').primaryKey(),
    branchName: varchar('branch_name', { length: 150 }).notNull(),
    regionId: integer('region_id')
      .notNull()
      .references(() => regions.regionId, { onDelete: 'restrict' }),
    branchType: varchar('branch_type', { length: 50 }).notNull().default('Main'),
    address: text('address'),
    city: varchar('city', { length: 100 }),
    postalCode: varchar('postal_code', { length: 20 }),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 100 }),
    establishedDate: date('established_date'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('idx_branches_region_id').on(table.regionId),
    unique('uq_branches_name_region').on(table.branchName, table.regionId),
    unique('uq_branches_email').on(table.email),
    unique('uq_branches_phone').on(table.phone),
    check(
      'chk_branches_type',
      sql`${table.branchType} IN ('Main', 'Satellite', 'Cell', 'Campus', 'Online')`
    ),
  ]
);

// ============================================================================
// MEMBERS
// Purpose: Store church member information
// ============================================================================
export const members = pgTable(
  'members',
  {
    memberId: serial('member_id').primaryKey(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    middleName: varchar('middle_name', { length: 100 }),
    dateOfBirth: date('date_of_birth'),
    gender: varchar('gender', { length: 10 }),
    email: varchar('email', { length: 100 }).unique(),
    phone: varchar('phone', { length: 20 }),
    address: text('address'),
    city: varchar('city', { length: 100 }),
    postalCode: varchar('postal_code', { length: 20 }),
    homeBranchId: integer('home_branch_id')
      .notNull()
      .references(() => branches.branchId, { onDelete: 'restrict' }),
    membershipDate: date('membership_date').notNull().default(sql`CURRENT_DATE`),
    isActive: boolean('is_active').default(true),
    photoUrl: varchar('photo_url', { length: 255 }),
    emergencyContactName: varchar('emergency_contact_name', { length: 150 }),
    emergencyContactPhone: varchar('emergency_contact_phone', { length: 20 }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('idx_members_home_branch_id').on(table.homeBranchId),
    index('idx_members_is_active').on(table.isActive),
    index('idx_members_name').on(table.lastName, table.firstName),
    uniqueIndex('idx_members_phone_active')
      .on(table.phone)
      .where(sql`phone IS NOT NULL AND is_active = TRUE`),
    check(
      'chk_members_gender',
      sql`${table.gender} IN ('Male', 'Female')`
    ),
    check(
      'chk_members_membership_date',
      sql`${table.membershipDate} <= CURRENT_DATE`
    ),
  ]
);

// ============================================================================
// BRANCH_LEADERSHIP
// Purpose: Store pastor and elder assignments for each branch
// ============================================================================
export const branchLeadership = pgTable(
  'branch_leadership',
  {
    leadershipId: serial('leadership_id').primaryKey(),
    branchId: integer('branch_id')
      .notNull()
      .references(() => branches.branchId, { onDelete: 'cascade' }),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.memberId, { onDelete: 'restrict' }),
    role: varchar('role', { length: 50 }).notNull(),
    startDate: date('start_date').notNull().default(sql`CURRENT_DATE`),
    endDate: date('end_date'),
    isCurrent: boolean('is_current').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('idx_branch_leadership_branch_id').on(table.branchId),
    index('idx_branch_leadership_member_id').on(table.memberId),
    index('idx_branch_leadership_is_current').on(table.isCurrent),
    unique('uq_branch_leadership_assignment').on(
      table.branchId,
      table.memberId,
      table.role,
      table.startDate
    ),
    uniqueIndex('idx_branch_leadership_current_pastor')
      .on(table.branchId)
      .where(sql`role = 'Main Pastor' AND is_current = TRUE`),
    uniqueIndex('idx_branch_leadership_current_member_role')
      .on(table.branchId, table.memberId, table.role)
      .where(sql`is_current = TRUE`),
    check(
      'chk_branch_leadership_role',
      sql`${table.role} IN ('Main Pastor', 'Elder')`
    ),
    check(
      'chk_branch_leadership_dates',
      sql`${table.endDate} IS NULL OR ${table.endDate} >= ${table.startDate}`
    ),
  ]
);

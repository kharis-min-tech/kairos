import { pgTable, uuid, varchar, text, date, boolean, timestamp, index, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { branches } from './branches';
import { memberRoles } from './member-roles';
import { fellowshipMembers } from './fellowship-members';
import { branchLeadership } from './branch-leadership';

export const members = pgTable('members', {
  id: uuid('id').defaultRandom().primaryKey(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  middleName: varchar('middle_name', { length: 100 }),
  dateOfBirth: date('date_of_birth'),
  gender: varchar('gender', { length: 10 }),
  email: varchar('email', { length: 100 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  homeBranchId: uuid('home_branch_id').notNull().references(() => branches.id, { onDelete: 'restrict' }),
  secondaryBranchId: uuid('secondary_branch_id').references(() => branches.id, { onDelete: 'set null' }),
  isAtSecondaryBranch: boolean('is_at_secondary_branch').default(false).notNull(),
  secondaryAddress: text('secondary_address'),
  secondaryCity: varchar('secondary_city', { length: 100 }),
  secondaryPostalCode: varchar('secondary_postal_code', { length: 20 }),
  membershipDate: date('membership_date').notNull().defaultNow(),
  isActive: boolean('is_active').default(true).notNull(),
  photoUrl: text('photo_url'),
  emergencyContactName: varchar('emergency_contact_name', { length: 150 }),
  emergencyContactPhone: varchar('emergency_contact_phone', { length: 20 }),
  emergencyContactRelationship: varchar('emergency_contact_relationship', { length: 50 }),
  // Auth columns (not in db_release — added for local auth)
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  approvalStatus: varchar('approval_status', { length: 20 }).default('pending').notNull(),
  systemRole: varchar('system_role', { length: 20 }).default('member').notNull(),
  // RBAC Phase 4: honorific is a display-only title preserved across the
  // pastor/elder/leader → member collapse. Populated by the migration for
  // members who held those system roles before the cutover. New signups
  // leave it null; admins can edit it via the member-profile UI.
  honorific: varchar('honorific', { length: 50 }),
  memberType: varchar('member_type', { length: 20 }).default('member').notNull(),
  guardianMemberId: uuid('guardian_member_id').references((): AnyPgColumn => members.id, { onDelete: 'set null' }),
  passwordResetToken: varchar('password_reset_token', { length: 255 }),
  passwordResetExpiry: timestamp('password_reset_expiry'),
  lastLoginAt: timestamp('last_login_at'),
  mustChangePassword: boolean('must_change_password').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_members_home_branch_id').on(table.homeBranchId),
  index('idx_members_secondary_branch_id').on(table.secondaryBranchId),
  index('idx_members_is_active').on(table.isActive),
  index('idx_members_name').on(table.lastName, table.firstName),
  index('idx_members_guardian_member_id').on(table.guardianMemberId),
  uniqueIndex('idx_members_phone_active')
    .on(table.phone)
    .where(sql`phone IS NOT NULL AND is_active = TRUE`),
  sql`CHECK (gender IN ('Male', 'Female'))`,
  sql`CHECK (approval_status IN ('pending', 'approved', 'rejected'))`,
  sql`CHECK (system_role IN ('admin', 'pastor', 'leader', 'member'))`,
  sql`CHECK (member_type IN ('member', 'prospect', 'visitor', 'child'))`,
]);

export const membersRelations = relations(members, ({ one, many }) => ({
  homeBranch: one(branches, { fields: [members.homeBranchId], references: [branches.id], relationName: 'homeBranch' }),
  secondaryBranch: one(branches, { fields: [members.secondaryBranchId], references: [branches.id], relationName: 'secondaryBranch' }),
  guardian: one(members, { fields: [members.guardianMemberId], references: [members.id], relationName: 'guardian' }),
  memberRoles: many(memberRoles),
  fellowshipMemberships: many(fellowshipMembers),
  leadershipPositions: many(branchLeadership),
}));

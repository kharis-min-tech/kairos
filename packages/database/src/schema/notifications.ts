import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  index,
  check,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { branches, regions, members } from './core';
import { departments } from './departments';
import { fellowships } from './fellowships';

// ============================================================================
// ROLES
// Purpose: Store church role definitions (e.g., Choir Member, Usher, Teacher)
// ============================================================================
export const roles = pgTable(
  'roles',
  {
    roleId: serial('role_id').primaryKey(),
    roleName: varchar('role_name', { length: 100 }).notNull().unique(),
    description: text('description'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [index('idx_roles_is_active').on(table.isActive)]
);

// ============================================================================
// NOTIFICATIONS
// Purpose: Store notifications and announcements broadcast to members
// ============================================================================
export const notifications = pgTable(
  'notifications',
  {
    notificationId: serial('notification_id').primaryKey(),
    title: varchar('title', { length: 200 }).notNull(),
    message: text('message').notNull(),
    notificationType: varchar('notification_type', { length: 30 }).notNull(),
    priority: varchar('priority', { length: 20 }).default('Normal'),

    // Target audience
    targetScope: varchar('target_scope', { length: 30 }).notNull(),
    targetBranchId: integer('target_branch_id').references(() => branches.branchId, {
      onDelete: 'cascade',
    }),
    targetRegionId: integer('target_region_id').references(() => regions.regionId, {
      onDelete: 'cascade',
    }),
    targetDepartmentId: integer('target_department_id').references(
      () => departments.departmentId,
      { onDelete: 'cascade' }
    ),
    targetFellowshipId: integer('target_fellowship_id').references(
      () => fellowships.fellowshipId,
      { onDelete: 'cascade' }
    ),
    targetRoleId: integer('target_role_id').references(() => roles.roleId, {
      onDelete: 'cascade',
    }),
    targetLeadershipRole: varchar('target_leadership_role', { length: 50 }),

    // Sender info
    sentBy: integer('sent_by')
      .notNull()
      .references(() => members.memberId, { onDelete: 'restrict' }),
    sentAt: timestamp('sent_at').notNull().defaultNow(),

    // Scheduling
    scheduledFor: timestamp('scheduled_for'),
    expiresAt: timestamp('expires_at'),

    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('idx_notifications_sent_by').on(table.sentBy),
    index('idx_notifications_sent_at').on(table.sentAt),
    index('idx_notifications_target_scope').on(table.targetScope),
    index('idx_notifications_target_branch_id').on(table.targetBranchId),
    index('idx_notifications_target_region_id').on(table.targetRegionId),
    index('idx_notifications_target_department_id').on(table.targetDepartmentId),
    index('idx_notifications_target_fellowship_id').on(table.targetFellowshipId),
    index('idx_notifications_target_role_id').on(table.targetRoleId),
    index('idx_notifications_target_leadership_role').on(table.targetLeadershipRole),
    index('idx_notifications_is_active').on(table.isActive),
    check(
      'chk_notifications_type',
      sql`${table.notificationType} IN ('Announcement', 'Reminder', 'Alert', 'Event', 'General')`
    ),
    check(
      'chk_notifications_priority',
      sql`${table.priority} IN ('Low', 'Normal', 'High', 'Urgent')`
    ),
    check(
      'chk_notifications_scope',
      sql`${table.targetScope} IN ('All', 'Branch', 'Region', 'Department', 'Fellowship', 'Role', 'Leadership')`
    ),
    check(
      'chk_notifications_leadership_role',
      sql`${table.targetLeadershipRole} IS NULL OR ${table.targetLeadershipRole} IN ('Main Pastor', 'Elder')`
    ),
    check(
      'chk_notifications_target_consistency',
      sql`(${table.targetScope} = 'All' AND ${table.targetBranchId} IS NULL AND ${table.targetRegionId} IS NULL AND ${table.targetDepartmentId} IS NULL AND ${table.targetFellowshipId} IS NULL AND ${table.targetRoleId} IS NULL AND ${table.targetLeadershipRole} IS NULL) OR (${table.targetScope} = 'Branch' AND ${table.targetBranchId} IS NOT NULL) OR (${table.targetScope} = 'Region' AND ${table.targetRegionId} IS NOT NULL) OR (${table.targetScope} = 'Department' AND ${table.targetDepartmentId} IS NOT NULL) OR (${table.targetScope} = 'Fellowship' AND ${table.targetFellowshipId} IS NOT NULL) OR (${table.targetScope} = 'Role' AND ${table.targetRoleId} IS NOT NULL) OR (${table.targetScope} = 'Leadership' AND ${table.targetLeadershipRole} IS NOT NULL)`
    ),
  ]
);

// ============================================================================
// NOTIFICATION_RECIPIENTS
// Purpose: Track which members received and read notifications
// ============================================================================
export const notificationRecipients = pgTable(
  'notification_recipients',
  {
    notificationId: integer('notification_id')
      .notNull()
      .references(() => notifications.notificationId, { onDelete: 'cascade' }),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.memberId, { onDelete: 'cascade' }),
    isRead: boolean('is_read').default(false),
    readAt: timestamp('read_at'),
    isDismissed: boolean('is_dismissed').default(false),
    dismissedAt: timestamp('dismissed_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.notificationId, table.memberId] }),
    index('idx_notification_recipients_notification_id').on(table.notificationId),
    index('idx_notification_recipients_member_id').on(table.memberId),
    index('idx_notification_recipients_is_read').on(table.isRead),
  ]
);

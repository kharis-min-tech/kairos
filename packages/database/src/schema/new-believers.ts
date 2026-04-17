import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { members } from './members';
import { branches } from './branches';

// ============================================================================
// NEW_BELIEVER_ENROLLMENTS
// One row per member going through the new believers class.
// Created automatically when a soul is converted or an altar-call form is submitted.
// ============================================================================
export const newBelieverEnrollments = pgTable(
  'new_believer_enrollments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
    teacherId: uuid('teacher_id').references(() => members.id, { onDelete: 'set null' }),
    stage: varchar('stage', { length: 30 }).notNull().default('enrolled'),
    enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    // JSONB map of stage → ISO completion timestamp, e.g. {"session-1":"2026-04-17T..."}
    sessionCompletedAt: jsonb('session_completed_at').$type<Record<string, string>>(),
    // Set when member joins a department at the integrated stage
    joinedDepartmentId: uuid('joined_department_id'),
    notes: text('notes'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_nb_enrollments_member_id').on(table.memberId),
    index('idx_nb_enrollments_branch_id').on(table.branchId),
    index('idx_nb_enrollments_teacher_id').on(table.teacherId),
    index('idx_nb_enrollments_stage').on(table.stage),
    index('idx_nb_enrollments_is_active').on(table.isActive),
    // Partial unique index: only one ACTIVE enrollment per member per branch at a time
    // (enforced via raw migration 0007 — Drizzle unique() can't express WHERE clauses)
    sql`CHECK (stage IN ('enrolled', 'session-1', 'session-2', 'session-3', 'session-4', 'completed', 'integrated'))`,
  ]
);

// ============================================================================
// NEW_BELIEVER_SESSIONS
// A scheduled class session for a branch. Teacher-led.
// ============================================================================
export const newBelieverSessions = pgTable(
  'new_believer_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
    teacherId: uuid('teacher_id').references(() => members.id, { onDelete: 'set null' }),
    sessionDate: timestamp('session_date').notNull(),
    topic: varchar('topic', { length: 200 }).notNull(),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => members.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_nb_sessions_branch_id').on(table.branchId),
    index('idx_nb_sessions_teacher_id').on(table.teacherId),
    index('idx_nb_sessions_session_date').on(table.sessionDate),
  ]
);

// ============================================================================
// NEW_BELIEVER_ATTENDANCE
// Records whether an enrolled member attended a specific session.
// Composite PK (sessionId, enrollmentId) — one record per person per session.
// ============================================================================
export const newBelieverAttendance = pgTable(
  'new_believer_attendance',
  {
    sessionId: uuid('session_id').notNull().references(() => newBelieverSessions.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id').notNull().references(() => newBelieverEnrollments.id, { onDelete: 'cascade' }),
    attended: boolean('attended').notNull().default(false),
    notes: text('notes'),
    recordedAt: timestamp('recorded_at').defaultNow().notNull(),
    recordedBy: uuid('recorded_by').references(() => members.id, { onDelete: 'set null' }),
  },
  (table) => [
    primaryKey({ columns: [table.sessionId, table.enrollmentId] }),
    index('idx_nb_attendance_session_id').on(table.sessionId),
    index('idx_nb_attendance_enrollment_id').on(table.enrollmentId),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================
export const newBelieverEnrollmentsRelations = relations(newBelieverEnrollments, ({ one, many }) => ({
  member: one(members, { fields: [newBelieverEnrollments.memberId], references: [members.id] }),
  branch: one(branches, { fields: [newBelieverEnrollments.branchId], references: [branches.id] }),
  teacher: one(members, { fields: [newBelieverEnrollments.teacherId], references: [members.id] }),
  attendance: many(newBelieverAttendance),
}));

export const newBelieverSessionsRelations = relations(newBelieverSessions, ({ one, many }) => ({
  branch: one(branches, { fields: [newBelieverSessions.branchId], references: [branches.id] }),
  teacher: one(members, { fields: [newBelieverSessions.teacherId], references: [members.id] }),
  createdByMember: one(members, { fields: [newBelieverSessions.createdBy], references: [members.id] }),
  attendance: many(newBelieverAttendance),
}));

export const newBelieverAttendanceRelations = relations(newBelieverAttendance, ({ one }) => ({
  session: one(newBelieverSessions, { fields: [newBelieverAttendance.sessionId], references: [newBelieverSessions.id] }),
  enrollment: one(newBelieverEnrollments, { fields: [newBelieverAttendance.enrollmentId], references: [newBelieverEnrollments.id] }),
  recordedByMember: one(members, { fields: [newBelieverAttendance.recordedBy], references: [members.id] }),
}));

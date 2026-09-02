import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  integer,
  boolean,
  timestamp,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { members } from './members';
import { branches } from './branches';

// ============================================================================
// MEMBERSHIP CLASSES
//
// The machinery behind `members.membershipClassCompletedAt`, the canonical
// "is this person a confirmed Member?" signal (see
// apps/api/src/lib/member-predicates.ts). Graduating a cohort is what stamps
// that column; the admin override in members/service.ts remains the manual
// escape hatch.
//
// BRANCH ISOLATION EXCEPTION — READ BEFORE "FIXING" THIS.
// `membershipCohorts` has NO branchId on purpose. Membership classes run
// church-wide rather than per branch, so a cohort is a global row any approved
// member may enrol in. This is a deliberate product decision, not an
// oversight. Branch reporting survives because the member's home branch is
// denormalised onto `membershipEnrollments.branchId` at enrolment.
//
// Deliberately independent of the new believers pipeline: no auto-enrolment,
// no bulk enrol from that module, no foreign keys between the two.
// ============================================================================

// ============================================================================
// MEMBERSHIP_COHORTS
// One run of the four-week class, with a unique name like "Autumn 2026".
// ============================================================================
export const membershipCohorts = pgTable(
  'membership_cohorts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description'),
    startDate: date('start_date').notNull(),
    /**
     * The induction / graduation ceremony date. Completing session 4 is not
     * completion on its own — a member must attend this to graduate.
     */
    graduationDate: date('graduation_date'),
    /** Members must sit AND pass the final test on or before this date. */
    finalTestDeadline: date('final_test_deadline'),
    status: varchar('status', { length: 20 }).notNull().default('planned'),
    /**
     * Whether members can self-enrol right now. Separate from `status` so an
     * already-running cohort can be closed to late joiners.
     */
    enrolmentOpen: boolean('enrolment_open').notNull().default(true),
    /**
     * Pass marks are per cohort so a run can set a different bar without
     * rewriting historical results.
     */
    homeworkPassMark: integer('homework_pass_mark').notNull().default(50),
    quizPassMark: integer('quiz_pass_mark').notNull().default(50),
    finalTestPassMark: integer('final_test_pass_mark').notNull().default(50),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => members.id, { onDelete: 'set null' }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_membership_cohorts_status').on(table.status),
    index('idx_membership_cohorts_start_date').on(table.startDate),
    index('idx_membership_cohorts_is_active').on(table.isActive),
    // Case-insensitive unique name among active cohorts — enforced by the
    // partial index in migration 0047 (Drizzle can't express LOWER() + WHERE).
    sql`CHECK (status IN ('planned', 'active', 'completed', 'cancelled'))`,
    sql`CHECK (homework_pass_mark BETWEEN 0 AND 100 AND quiz_pass_mark BETWEEN 0 AND 100 AND final_test_pass_mark BETWEEN 0 AND 100)`,
    sql`CHECK (graduation_date IS NULL OR graduation_date >= start_date)`,
  ],
);

// ============================================================================
// MEMBERSHIP_COHORT_TEACHERS
// Many teachers per cohort; no mentors (that is the new believers shape).
//
// This table is the authority model for teaching. Cohorts are church-wide, so
// no branch-scoped RBAC grant can express "teaches this cohort" — marking
// permission is a membership test against these rows instead.
// ============================================================================
export const membershipCohortTeachers = pgTable(
  'membership_cohort_teachers',
  {
    cohortId: uuid('cohort_id')
      .notNull()
      .references(() => membershipCohorts.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull().default('teacher'),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
    assignedBy: uuid('assigned_by').references(() => members.id, { onDelete: 'set null' }),
  },
  (table) => [
    primaryKey({ columns: [table.cohortId, table.memberId] }),
    index('idx_membership_cohort_teachers_member_id').on(table.memberId),
    sql`CHECK (role IN ('lead', 'teacher'))`,
  ],
);

// ============================================================================
// MEMBERSHIP_SESSIONS
// Four per cohort, numbered 1 to 4.
// ============================================================================
export const membershipSessions = pgTable(
  'membership_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    cohortId: uuid('cohort_id')
      .notNull()
      .references(() => membershipCohorts.id, { onDelete: 'cascade' }),
    sessionNumber: integer('session_number').notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    sessionDate: timestamp('session_date'),
    location: text('location'),
    teacherId: uuid('teacher_id').references(() => members.id, { onDelete: 'set null' }),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_membership_sessions_teacher_id').on(table.teacherId),
    sql`CHECK (session_number BETWEEN 1 AND 4)`,
  ],
);

// ============================================================================
// MEMBERSHIP_ENROLLMENTS
// One row per member per cohort.
// ============================================================================
export const membershipEnrollments = pgTable(
  'membership_enrollments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    cohortId: uuid('cohort_id')
      .notNull()
      .references(() => membershipCohorts.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    /**
     * Denormalised from `members.homeBranchId` at enrolment. Cohorts are
     * church-wide, so this is the only handle a branch leader has for
     * filtering the roster to their own people.
     */
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 20 }).notNull().default('enrolled'),
    enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
    /** TRUE when the member enrolled themselves rather than an admin doing it. */
    selfEnrolled: boolean('self_enrolled').notNull().default(false),
    /**
     * Final test. `passed` is derived against the cohort's pass mark at write
     * time and stored, so historical results survive a later change to the mark.
     */
    finalTestScore: integer('final_test_score'),
    finalTestPassed: boolean('final_test_passed'),
    finalTestTakenAt: timestamp('final_test_taken_at'),
    /** The induction / graduation ceremony. Required for graduation. */
    inductionAttended: boolean('induction_attended').notNull().default(false),
    inductionAttendedAt: timestamp('induction_attended_at'),
    graduatedAt: timestamp('graduated_at'),
    withdrawnReason: varchar('withdrawn_reason', { length: 30 }),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_membership_enrollments_member_id').on(table.memberId),
    index('idx_membership_enrollments_branch_id').on(table.branchId),
    index('idx_membership_enrollments_status').on(table.status),
    // Unique (cohort, member) and the one-open-enrolment-per-member partial
    // index both live in migration 0047.
    sql`CHECK (status IN ('enrolled', 'graduated', 'withdrawn', 'deferred'))`,
    sql`CHECK (final_test_score IS NULL OR final_test_score BETWEEN 0 AND 100)`,
    sql`CHECK (withdrawn_reason IS NULL OR withdrawn_reason IN ('stopped_attending', 'withdrew', 'moved_away', 'deferred_to_next', 'other'))`,
  ],
);

// ============================================================================
// MEMBERSHIP_SESSION_RECORDS
// Per (session, enrollment): attendance plus the homework and quiz marks.
// A score and its pass flag are written together or not at all.
// ============================================================================
export const membershipSessionRecords = pgTable(
  'membership_session_records',
  {
    sessionId: uuid('session_id')
      .notNull()
      .references(() => membershipSessions.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => membershipEnrollments.id, { onDelete: 'cascade' }),
    attended: boolean('attended').notNull().default(false),
    homeworkScore: integer('homework_score'),
    homeworkPassed: boolean('homework_passed'),
    quizScore: integer('quiz_score'),
    quizPassed: boolean('quiz_passed'),
    notes: text('notes'),
    recordedAt: timestamp('recorded_at').defaultNow().notNull(),
    recordedBy: uuid('recorded_by').references(() => members.id, { onDelete: 'set null' }),
  },
  (table) => [
    primaryKey({ columns: [table.sessionId, table.enrollmentId] }),
    index('idx_membership_session_records_enrollment_id').on(table.enrollmentId),
    sql`CHECK ((homework_score IS NULL AND homework_passed IS NULL) OR (homework_score BETWEEN 0 AND 100 AND homework_passed IS NOT NULL))`,
    sql`CHECK ((quiz_score IS NULL AND quiz_passed IS NULL) OR (quiz_score BETWEEN 0 AND 100 AND quiz_passed IS NOT NULL))`,
  ],
);

// ============================================================================
// RELATIONS
// ============================================================================
export const membershipCohortsRelations = relations(membershipCohorts, ({ one, many }) => ({
  createdByMember: one(members, {
    fields: [membershipCohorts.createdBy],
    references: [members.id],
  }),
  teachers: many(membershipCohortTeachers),
  sessions: many(membershipSessions),
  enrollments: many(membershipEnrollments),
}));

export const membershipCohortTeachersRelations = relations(
  membershipCohortTeachers,
  ({ one }) => ({
    cohort: one(membershipCohorts, {
      fields: [membershipCohortTeachers.cohortId],
      references: [membershipCohorts.id],
    }),
    member: one(members, {
      fields: [membershipCohortTeachers.memberId],
      references: [members.id],
      relationName: 'membershipTeacher',
    }),
  }),
);

export const membershipSessionsRelations = relations(membershipSessions, ({ one, many }) => ({
  cohort: one(membershipCohorts, {
    fields: [membershipSessions.cohortId],
    references: [membershipCohorts.id],
  }),
  teacher: one(members, {
    fields: [membershipSessions.teacherId],
    references: [members.id],
  }),
  records: many(membershipSessionRecords),
}));

export const membershipEnrollmentsRelations = relations(
  membershipEnrollments,
  ({ one, many }) => ({
    cohort: one(membershipCohorts, {
      fields: [membershipEnrollments.cohortId],
      references: [membershipCohorts.id],
    }),
    member: one(members, {
      fields: [membershipEnrollments.memberId],
      references: [members.id],
      relationName: 'membershipStudent',
    }),
    branch: one(branches, {
      fields: [membershipEnrollments.branchId],
      references: [branches.id],
    }),
    records: many(membershipSessionRecords),
  }),
);

export const membershipSessionRecordsRelations = relations(
  membershipSessionRecords,
  ({ one }) => ({
    session: one(membershipSessions, {
      fields: [membershipSessionRecords.sessionId],
      references: [membershipSessions.id],
    }),
    enrollment: one(membershipEnrollments, {
      fields: [membershipSessionRecords.enrollmentId],
      references: [membershipEnrollments.id],
    }),
    recordedByMember: one(members, {
      fields: [membershipSessionRecords.recordedBy],
      references: [members.id],
    }),
  }),
);

export type MembershipCohort = typeof membershipCohorts.$inferSelect;
export type NewMembershipCohort = typeof membershipCohorts.$inferInsert;
export type MembershipCohortTeacher = typeof membershipCohortTeachers.$inferSelect;
export type MembershipSession = typeof membershipSessions.$inferSelect;
export type MembershipEnrollment = typeof membershipEnrollments.$inferSelect;
export type MembershipSessionRecord = typeof membershipSessionRecords.$inferSelect;

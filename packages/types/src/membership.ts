// ── Membership classes ────────────────────────────────────────────────────
//
// Entities and request shapes for the four-week membership class, plus the
// graduation gate itself.
//
// Cohorts are CHURCH-WIDE, not branch-scoped: there is no `branchId` on a
// cohort. `MembershipEnrollment.branchId` carries the member's home branch at
// enrolment so branch leaders can still filter a roster. See
// packages/database/src/schema/membership.ts for the full rationale.

export type MembershipCohortStatus = 'planned' | 'active' | 'completed' | 'cancelled';
export type MembershipEnrollmentStatus = 'enrolled' | 'graduated' | 'withdrawn' | 'deferred';

/**
 * Pool lifecycle.
 *
 *   waiting   — in the pool, awaiting admission by a Membership Admin
 *   admitted  — placed into a cohort; `admittedCohortId` says which
 *   lapsed    — the entry expired before anyone admitted them
 *   withdrawn — they took themselves back out
 *
 * Only `waiting` is live. The other three are terminal: re-expressing
 * interest creates a NEW entry rather than reviving an old one, so the wait
 * restarts and nobody accrues seniority during a season away.
 */
export type MembershipInterestStatus = 'waiting' | 'admitted' | 'lapsed' | 'withdrawn';

/**
 * How long an unadmitted pool entry stays live, in days.
 *
 * Enrolment is not self-service: you express interest, wait in the pool, and
 * an admin admits you into an intake. Somebody who expressed interest and
 * then stopped attending for a season should not roll silently into the next
 * intake, because they most likely will not be there. So entries expire.
 *
 * Written onto each row as an absolute `expiresAt` when interest is
 * expressed, so changing this constant never retroactively lapses or revives
 * anyone already in the pool.
 */
export const MEMBERSHIP_INTEREST_WINDOW_DAYS = 180;

export type MembershipWithdrawnReason =
  | 'stopped_attending'
  | 'withdrew'
  | 'moved_away'
  | 'deferred_to_next'
  | 'other';

/** The four sessions every cohort runs. */
export const MEMBERSHIP_SESSION_NUMBERS = [1, 2, 3, 4] as const;
export type MembershipSessionNumber = (typeof MEMBERSHIP_SESSION_NUMBERS)[number];

export interface MembershipCohort {
  id: string;
  name: string;
  description?: string | null;
  startDate: string;
  graduationDate?: string | null;
  finalTestDeadline?: string | null;
  status: MembershipCohortStatus;
  enrolmentOpen: boolean;
  homeworkPassMark: number;
  quizPassMark: number;
  finalTestPassMark: number;
  notes?: string | null;
  createdBy?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipCohortSummary extends MembershipCohort {
  enrolledCount: number;
  graduatedCount: number;
  sessionCount: number;
}

/**
 * One entry in the pre-cohort pool.
 *
 * Belongs to no cohort until an admin admits it: people express interest
 * before an intake exists to join. See {@link MembershipInterestStatus}.
 */
export interface MembershipInterest {
  id: string;
  memberId: string;
  branchId?: string | null;
  status: MembershipInterestStatus;
  expressedAt: string;
  expiresAt: string;
  admittedCohortId?: string | null;
  admittedAt?: string | null;
  admittedBy?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * A pool entry as the admission screen shows it.
 *
 * `waitingDays` and `recentAttendanceCount` exist because admission is a
 * judgement call: the admin needs to see who has been waiting longest AND who
 * has actually been around lately, so a name that lapses is a decision rather
 * than a surprise.
 */
export interface MembershipInterestWithMember extends MembershipInterest {
  memberFirstName: string;
  memberLastName: string;
  memberEmail?: string | null;
  memberPhone?: string | null;
  branchName?: string | null;
  /** Whole days between `expressedAt` and now. */
  waitingDays: number;
  /** Services attended in the last 90 days. Null when attendance isn't tracked. */
  recentAttendanceCount: number | null;
}

export interface MembershipSession {
  id: string;
  cohortId: string;
  sessionNumber: MembershipSessionNumber;
  title: string;
  sessionDate?: string | null;
  location?: string | null;
  teacherId?: string | null;
  teacherFirstName?: string | null;
  teacherLastName?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipSessionRecord {
  sessionId: string;
  enrollmentId: string;
  sessionNumber: MembershipSessionNumber;
  attended: boolean;
  homeworkScore?: number | null;
  homeworkPassed?: boolean | null;
  quizScore?: number | null;
  quizPassed?: boolean | null;
  notes?: string | null;
  recordedAt?: string | null;
}

export interface MembershipEnrollment {
  id: string;
  cohortId: string;
  memberId: string;
  branchId?: string | null;
  status: MembershipEnrollmentStatus;
  enrolledAt: string;
  /**
   * TRUE when the member reached this cohort through the interest pool,
   * FALSE when an admin added them directly (the paper-signup case).
   * Renamed from `selfEnrolled` in 0048; self-enrolment no longer exists.
   */
  fromPool: boolean;
  finalTestScore?: number | null;
  finalTestPassed?: boolean | null;
  finalTestTakenAt?: string | null;
  inductionAttended: boolean;
  inductionAttendedAt?: string | null;
  graduatedAt?: string | null;
  withdrawnReason?: MembershipWithdrawnReason | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipEnrollmentWithMember extends MembershipEnrollment {
  memberFirstName: string;
  memberLastName: string;
  memberEmail?: string | null;
  branchName?: string | null;
}

/** An enrolment plus everything the graduation gate needs to be evaluated. */
export interface MembershipEnrollmentDetail extends MembershipEnrollmentWithMember {
  cohortName: string;
  records: MembershipSessionRecord[];
  readiness: MembershipGraduationReadiness;
}

// ── Graduation gate ───────────────────────────────────────────────────────

/**
 * The six requirements. Completing session 4 is NOT completion on its own:
 * the coursework must be passed, the final test passed before its deadline,
 * and the induction / graduation ceremony attended.
 */
export interface MembershipGraduationReadiness {
  attendedAllSessions: boolean;
  passedAllHomework: boolean;
  passedAllQuizzes: boolean;
  passedFinalTest: boolean;
  finalTestBeforeDeadline: boolean;
  attendedInduction: boolean;
  /** True only when all six above are true. */
  eligible: boolean;
  /** Human-readable reasons the member is not yet eligible, for the UI. */
  outstanding: string[];
}

/** Inputs to {@link evaluateGraduationReadiness}, decoupled from the DB rows. */
export interface MembershipReadinessInput {
  sessionCount: number;
  records: Pick<
    MembershipSessionRecord,
    'attended' | 'homeworkPassed' | 'quizPassed' | 'sessionNumber'
  >[];
  finalTestPassed?: boolean | null;
  finalTestTakenAt?: string | null;
  finalTestDeadline?: string | null;
  inductionAttended: boolean;
}

/**
 * The single source of truth for "can this person graduate?".
 *
 * Pure and dependency-free so the API can gate on it and both clients can
 * render exactly which requirements are outstanding without a second
 * implementation drifting from this one.
 *
 * A cohort with no sessions scheduled yet is never eligible — otherwise the
 * "attended all sessions" test would vacuously pass on an empty roster.
 */
export function evaluateGraduationReadiness(
  input: MembershipReadinessInput,
): MembershipGraduationReadiness {
  const {
    sessionCount,
    records,
    finalTestPassed,
    finalTestTakenAt,
    finalTestDeadline,
    inductionAttended,
  } = input;

  const hasSessions = sessionCount > 0;
  const attendedRecords = records.filter((r) => r.attended);

  const attendedAllSessions = hasSessions && attendedRecords.length >= sessionCount;
  const passedAllHomework =
    hasSessions &&
    records.filter((r) => r.homeworkPassed === true).length >= sessionCount;
  const passedAllQuizzes =
    hasSessions && records.filter((r) => r.quizPassed === true).length >= sessionCount;

  const passedFinalTest = finalTestPassed === true;

  // No deadline set means there is nothing to be late for. A deadline with no
  // recorded sitting is a fail, not a pass.
  const finalTestBeforeDeadline = !finalTestDeadline
    ? passedFinalTest
    : !!finalTestTakenAt &&
      new Date(finalTestTakenAt).getTime() <= endOfDay(finalTestDeadline);

  const attendedInduction = inductionAttended === true;

  const outstanding: string[] = [];
  if (!attendedAllSessions) outstanding.push('Has not attended all four sessions');
  if (!passedAllHomework) outstanding.push('Homework not passed for every session');
  if (!passedAllQuizzes) outstanding.push('Quiz not passed for every session');
  if (!passedFinalTest) outstanding.push('Final test not passed');
  else if (!finalTestBeforeDeadline) outstanding.push('Final test taken after the deadline');
  if (!attendedInduction) outstanding.push('Has not attended the induction ceremony');

  return {
    attendedAllSessions,
    passedAllHomework,
    passedAllQuizzes,
    passedFinalTest,
    finalTestBeforeDeadline,
    attendedInduction,
    eligible: outstanding.length === 0,
    outstanding,
  };
}

/**
 * A deadline is a calendar date, so a test sat at any time on that day counts.
 * Comparing against midnight would fail everyone who sat it on the day itself.
 */
function endOfDay(isoDate: string): number {
  const d = new Date(isoDate);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

// ── Request shapes ────────────────────────────────────────────────────────

export interface CreateMembershipCohortRequest {
  name: string;
  description?: string;
  startDate: string;
  graduationDate?: string;
  finalTestDeadline?: string;
  status?: MembershipCohortStatus;
  enrolmentOpen?: boolean;
  homeworkPassMark?: number;
  quizPassMark?: number;
  finalTestPassMark?: number;
  notes?: string;
}

export type UpdateMembershipCohortRequest = Partial<CreateMembershipCohortRequest>;

export interface UpsertMembershipSessionRequest {
  sessionNumber: MembershipSessionNumber;
  title: string;
  sessionDate?: string | null;
  location?: string | null;
  teacherId?: string | null;
  notes?: string | null;
}

/**
 * Admission: an admin moves people from the pool into a cohort.
 *
 * This is the ONLY way into a cohort. A member with no pool entry can still
 * be named here — someone who signed up on paper, say — and is admitted
 * directly; everyone else has their waiting entry closed as `admitted` in the
 * same transaction so they cannot sit in the pool and a cohort at once.
 */
export interface AdmitMembersRequest {
  memberIds: string[];
}

/** Filters for the admin's view of the pool. */
export interface ListMembershipInterestQuery {
  status?: MembershipInterestStatus;
  branchId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * One row of a register save. Scores are mandatory whenever the
 * corresponding assessment is being recorded at all: send both `homeworkScore`
 * and nothing else to clear a mark, or omit the field to leave it untouched.
 */
export interface MembershipRecordInput {
  enrollmentId: string;
  attended?: boolean;
  homeworkScore?: number | null;
  quizScore?: number | null;
  notes?: string | null;
}

export interface SaveMembershipSessionRecordsRequest {
  records: MembershipRecordInput[];
}

export interface RecordFinalTestRequest {
  enrollmentId: string;
  score: number;
  takenAt?: string;
}

export interface RecordInductionRequest {
  enrollmentIds: string[];
  attended: boolean;
  attendedAt?: string;
}

export interface GraduateMembersRequest {
  enrollmentIds: string[];
  /**
   * Admin override. When true the graduation gate is bypassed and the reason
   * is recorded on the enrolment. Mirrors the existing manual override on
   * `setMembershipClassCompleted`.
   */
  override?: boolean;
  overrideReason?: string;
  /** Defaults to the cohort's graduation date, then to today. */
  completedAt?: string;
}

export interface WithdrawMembershipEnrollmentRequest {
  reason: MembershipWithdrawnReason;
  notes?: string;
}

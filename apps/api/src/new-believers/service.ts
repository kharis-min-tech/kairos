import { eq, and, or, asc, desc, lt, sql, count } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { authHasCapability } from '../lib/grants';
import {
  newBelieverEnrollments,
  newBelieverSessions,
  newBelieverAttendance,
  members,
  memberRoles,
  roles,
  branchDepartments,
  departments,
  mentorFollowups,
} from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import { NotFoundError, ForbiddenError, ConflictError, sendMentorAssignedEmail, logger } from '@kairos/utils';
import { dispatchNotification } from '../notifications/service';
import { resolveBranchAuthority } from '../notifications/recipients';
import { NotificationEventType } from '@kairos/types';

function enrollmentPortalUrl(enrollmentId: string): string {
  const base = process.env['FRONTEND_URL'] ?? 'http://localhost:3002';
  return `${base}/new-believers/${enrollmentId}`;
}

// ── Helpers ────────────────────────────────────────────────

function enforceAdminOrPastor(auth: AuthContext) {
  if (!authHasCapability(auth, 'branch:read')) {
    throw new ForbiddenError('Only admins or pastors can perform this action');
  }
}

function enforceBranchScope(auth: AuthContext, branchId: string) {
  if (auth.systemRole === 'admin') return;
  if (auth.branchId !== branchId) {
    throw new ForbiddenError('You can only access new believers data for your branch');
  }
}

async function isNewBelieverTeacher(db: Database, memberId: string, branchId: string): Promise<boolean> {
  const [result] = await db
    .select({ id: memberRoles.id })
    .from(memberRoles)
    .innerJoin(roles, eq(memberRoles.roleId, roles.id))
    .where(
      and(
        eq(memberRoles.memberId, memberId),
        eq(memberRoles.branchId, branchId),
        eq(memberRoles.isActive, true),
        eq(roles.roleName, 'New Believers Teacher'),
      )
    )
    .limit(1);
  return !!result;
}

/**
 * Whether the given member leads (or deputies) the seeded "New Believers"
 * branch_department in their branch — the persona granted full visibility
 * across the entire NB pipeline.
 */
async function isNewBelieversDeptLeader(
  db: Database,
  memberId: string,
  branchId: string,
): Promise<boolean> {
  const [result] = await db
    .select({ id: branchDepartments.id })
    .from(branchDepartments)
    .innerJoin(departments, eq(branchDepartments.departmentId, departments.id))
    .where(
      and(
        eq(branchDepartments.branchId, branchId),
        eq(branchDepartments.isActive, true),
        eq(departments.departmentName, 'New Believers'),
        or(
          eq(branchDepartments.leadMemberId, memberId),
          eq(branchDepartments.deputyMemberId, memberId),
        ),
      ),
    )
    .limit(1);
  return !!result;
}

/**
 * What "hats" the given member wears in the NB pipeline for a branch.
 * Used by listEnrollments + getEnrollment to scope visibility.
 * Sets are checked top-down — admin/pastor short-circuit before we hit this.
 */
export async function getNewBelieverHats(
  db: Database,
  auth: AuthContext,
  branchId: string,
): Promise<{
  isNbLeader: boolean;
  hasTeacherRole: boolean;
  taughtEnrollmentIds: string[];
  mentoredEnrollmentIds: string[];
  ownEnrollmentIds: string[];
}> {
  const [isNbLeader, hasTeacherRole] = await Promise.all([
    isNewBelieversDeptLeader(db, auth.memberId, branchId),
    isNewBelieverTeacher(db, auth.memberId, branchId),
  ]);

  const rows = await db
    .select({
      id: newBelieverEnrollments.id,
      memberId: newBelieverEnrollments.memberId,
      teacherId: newBelieverEnrollments.teacherId,
      mentorId: newBelieverEnrollments.mentorId,
    })
    .from(newBelieverEnrollments)
    .where(
      and(
        eq(newBelieverEnrollments.branchId, branchId),
        eq(newBelieverEnrollments.isActive, true),
        or(
          eq(newBelieverEnrollments.memberId, auth.memberId),
          eq(newBelieverEnrollments.teacherId, auth.memberId),
          eq(newBelieverEnrollments.mentorId, auth.memberId),
        ),
      ),
    );

  return {
    isNbLeader,
    hasTeacherRole,
    taughtEnrollmentIds: rows.filter((r) => r.teacherId === auth.memberId).map((r) => r.id),
    mentoredEnrollmentIds: rows.filter((r) => r.mentorId === auth.memberId).map((r) => r.id),
    ownEnrollmentIds: rows.filter((r) => r.memberId === auth.memberId).map((r) => r.id),
  };
}

async function enforceTeacherOrAbove(db: Database, auth: AuthContext, branchId: string) {
  if (authHasCapability(auth, 'branch:read')) return;
  const isTeacher = await isNewBelieverTeacher(db, auth.memberId, branchId);
  if (!isTeacher) {
    throw new ForbiddenError('Only New Believers Teachers, pastors, or admins can perform this action');
  }
}

const STAGE_ORDER = [
  'enrolled',
  'session-1',
  'session-2',
  'session-3',
  'session-4',
  'completed',
  'integrated',
] as const;

/** Days of inactivity that mark an enrollment as "stale". */
export const STALE_THRESHOLD_DAYS = 7;

/**
 * Shared stale-enrollment predicate — reused by `listEnrollments` (stale=true filter)
 * and `getHealthSummary`. Single source of truth for "what counts as stale".
 *
 * Definition: active enrollment, not yet completed/integrated, no update in N days.
 */
export function staleEnrollmentCondition() {
  return and(
    eq(newBelieverEnrollments.isActive, true),
    sql`${newBelieverEnrollments.stage} NOT IN ('completed', 'integrated')`,
    lt(newBelieverEnrollments.updatedAt, sql`NOW() - INTERVAL '${sql.raw(String(STALE_THRESHOLD_DAYS))} days'`),
  )!;
}

const SESSION_STAGES = new Set(['session-1', 'session-2', 'session-3', 'session-4']);

const SESSION_TOPICS: Record<string, string> = {
  'session-1': 'Foundations of Faith',
  'session-2': 'Who is a Christian',
  'session-3': 'Working out your Salvation',
  'session-4': 'The Importance of Fellowship',
};

function isForwardStageMove(currentStage: string, targetStage: string) {
  const currentIdx = STAGE_ORDER.findIndex((stage) => stage === currentStage);
  const targetIdx = STAGE_ORDER.findIndex((stage) => stage === targetStage);
  if (currentIdx < 0 || targetIdx < 0) return true;
  return targetIdx > currentIdx;
}

function hasSessionFeedback(feedbackMap: Record<string, string>, stage: string) {
  return typeof feedbackMap[stage] === 'string' && feedbackMap[stage].trim().length > 0;
}

async function hasAttendedSessionStage(
  db: Database,
  enrollmentId: string,
  sessionStage: string,
) {
  const [attendance] = await db
    .select({ sessionId: newBelieverAttendance.sessionId })
    .from(newBelieverAttendance)
    .innerJoin(newBelieverSessions, eq(newBelieverAttendance.sessionId, newBelieverSessions.id))
    .where(
      and(
        eq(newBelieverAttendance.enrollmentId, enrollmentId),
        eq(newBelieverAttendance.attended, true),
        eq(newBelieverSessions.sessionStage, sessionStage),
      )
    )
    .limit(1);

  return !!attendance;
}

// ── Enrollments ────────────────────────────────────────────

export async function listEnrollments(
  db: Database,
  auth: AuthContext,
  query: {
    branchId?: string;
    stage?: string;
    teacherId?: string;
    mentorId?: string;
    stale?: boolean;
    sortBy?: 'date-added' | 'name' | 'last-activity';
    page: number;
    limit: number;
  }
) {
  // Resolve branch scope
  const scopedBranchId = auth.systemRole === 'admin'
    ? query.branchId
    : auth.branchId;

  if (scopedBranchId) enforceBranchScope(auth, scopedBranchId);

  // Persona scope on the row set:
  //   admin / pastor → full branch
  //   NB-dept leader (lead/deputy of seeded "New Believers" branch_department) → full branch
  //   "New Believers Teacher" named role → full branch (operator)
  //   otherwise → only enrollments where the caller is student / teacher-on-row / mentor-on-row
  const personaConditions: Array<ReturnType<typeof eq> | ReturnType<typeof or>> = [];
  if (!authHasCapability(auth, 'branch:read')) {
    if (!scopedBranchId) {
      // No branch context for a non-admin/non-pastor → return empty rather than leak.
      return { data: [], total: 0, page: query.page, limit: query.limit, totalPages: 0 };
    }
    const [isNbLeader, hasTeacherRole] = await Promise.all([
      isNewBelieversDeptLeader(db, auth.memberId, scopedBranchId),
      isNewBelieverTeacher(db, auth.memberId, scopedBranchId),
    ]);
    if (!isNbLeader && !hasTeacherRole) {
      const personaOr = or(
        eq(newBelieverEnrollments.memberId, auth.memberId),
        eq(newBelieverEnrollments.teacherId, auth.memberId),
        eq(newBelieverEnrollments.mentorId, auth.memberId),
      );
      if (personaOr) personaConditions.push(personaOr);
    }
  }

  const conditions: Array<ReturnType<typeof eq> | ReturnType<typeof or>> = [];
  if (scopedBranchId) conditions.push(eq(newBelieverEnrollments.branchId, scopedBranchId));
  if (query.stage) conditions.push(eq(newBelieverEnrollments.stage, query.stage));
  if (query.teacherId) conditions.push(eq(newBelieverEnrollments.teacherId, query.teacherId));
  if (query.mentorId) conditions.push(eq(newBelieverEnrollments.mentorId, query.mentorId));
  if (query.stale) {
    // Shared predicate — keep behaviour in lock-step with getHealthSummary.
    conditions.push(staleEnrollmentCondition());
  } else {
    conditions.push(eq(newBelieverEnrollments.isActive, true));
  }
  conditions.push(...personaConditions);

  const offset = (query.page - 1) * query.limit;

  // Resolve sort columns via Drizzle helpers — no SQL concatenation.
  // Default 'date-added' = newest enrolledAt first.
  const orderColumns =
    query.sortBy === 'name'
      ? [asc(members.firstName), asc(members.lastName)]
      : query.sortBy === 'last-activity'
        ? [desc(newBelieverEnrollments.updatedAt)]
        : [desc(newBelieverEnrollments.enrolledAt)];

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: newBelieverEnrollments.id,
        memberId: newBelieverEnrollments.memberId,
        branchId: newBelieverEnrollments.branchId,
        teacherId: newBelieverEnrollments.teacherId,
        stage: newBelieverEnrollments.stage,
        enrolledAt: newBelieverEnrollments.enrolledAt,
        completedAt: newBelieverEnrollments.completedAt,
        sessionCompletedAt: newBelieverEnrollments.sessionCompletedAt,
        sessionFeedback: newBelieverEnrollments.sessionFeedback,
        joinedDepartmentId: newBelieverEnrollments.joinedDepartmentId,
        notes: newBelieverEnrollments.notes,
        isActive: newBelieverEnrollments.isActive,
        createdAt: newBelieverEnrollments.createdAt,
        updatedAt: newBelieverEnrollments.updatedAt,
        memberFirstName: members.firstName,
        memberLastName: members.lastName,
        teacherFirstName: sql<string | null>`t.first_name`,
        teacherLastName: sql<string | null>`t.last_name`,
        mentorId: newBelieverEnrollments.mentorId,
        mentorFirstName: sql<string | null>`m.first_name`,
        mentorLastName: sql<string | null>`m.last_name`,
      })
      .from(newBelieverEnrollments)
      .innerJoin(members, eq(newBelieverEnrollments.memberId, members.id))
      .leftJoin(
        sql`members t`,
        sql`${newBelieverEnrollments.teacherId} = t.id`
      )
      .leftJoin(
        sql`members m`,
        sql`${newBelieverEnrollments.mentorId} = m.id`
      )
      .where(and(...conditions))
      .orderBy(...orderColumns)
      .limit(query.limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(newBelieverEnrollments)
      .where(and(...conditions)),
  ]);

  const totalCount = Number(countRows[0]?.total ?? 0);

  return {
    data: rows,
    total: totalCount,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(totalCount / query.limit),
  };
}

export async function getEnrollment(db: Database, auth: AuthContext, enrollmentId: string) {
  const [enrollment] = await db
    .select({
      id: newBelieverEnrollments.id,
      memberId: newBelieverEnrollments.memberId,
      branchId: newBelieverEnrollments.branchId,
      teacherId: newBelieverEnrollments.teacherId,
      stage: newBelieverEnrollments.stage,
      enrolledAt: newBelieverEnrollments.enrolledAt,
      completedAt: newBelieverEnrollments.completedAt,
      sessionCompletedAt: newBelieverEnrollments.sessionCompletedAt,
      sessionFeedback: newBelieverEnrollments.sessionFeedback,
      joinedDepartmentId: newBelieverEnrollments.joinedDepartmentId,
      notes: newBelieverEnrollments.notes,
      isActive: newBelieverEnrollments.isActive,
      createdAt: newBelieverEnrollments.createdAt,
      updatedAt: newBelieverEnrollments.updatedAt,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      teacherFirstName: sql<string | null>`t.first_name`,
      teacherLastName: sql<string | null>`t.last_name`,
      mentorId: newBelieverEnrollments.mentorId,
      mentorFirstName: sql<string | null>`m.first_name`,
      mentorLastName: sql<string | null>`m.last_name`,
    })
    .from(newBelieverEnrollments)
    .innerJoin(members, eq(newBelieverEnrollments.memberId, members.id))
    .leftJoin(sql`members t`, sql`${newBelieverEnrollments.teacherId} = t.id`)
    .leftJoin(sql`members m`, sql`${newBelieverEnrollments.mentorId} = m.id`)
    .where(eq(newBelieverEnrollments.id, enrollmentId))
    .limit(1);

  if (!enrollment) throw new NotFoundError('Enrollment');
  enforceBranchScope(auth, enrollment.branchId);

  // Persona check — branch alone isn't enough. A member can only read an enrollment
  // if they are: the student on it, the teacher on it, the mentor on it,
  // the NB-dept leader for the branch, or hold the "New Believers Teacher" role.
  // Admin + pastor short-circuit.
  if (!authHasCapability(auth, 'branch:read')) {
    const isOwn =
      enrollment.memberId === auth.memberId ||
      enrollment.teacherId === auth.memberId ||
      enrollment.mentorId === auth.memberId;
    if (!isOwn) {
      const [isNbLeader, hasTeacherRole] = await Promise.all([
        isNewBelieversDeptLeader(db, auth.memberId, enrollment.branchId),
        isNewBelieverTeacher(db, auth.memberId, enrollment.branchId),
      ]);
      if (!isNbLeader && !hasTeacherRole) {
        throw new ForbiddenError('You do not have access to this enrollment');
      }
    }
  }

  // Fetch attendance history for this enrollment
  const attendanceHistory = await db
    .select({
      sessionId: newBelieverAttendance.sessionId,
      attended: newBelieverAttendance.attended,
      notes: newBelieverAttendance.notes,
      recordedAt: newBelieverAttendance.recordedAt,
      sessionDate: newBelieverSessions.sessionDate,
      topic: newBelieverSessions.topic,
    })
    .from(newBelieverAttendance)
    .innerJoin(newBelieverSessions, eq(newBelieverAttendance.sessionId, newBelieverSessions.id))
    .where(eq(newBelieverAttendance.enrollmentId, enrollmentId))
    .orderBy(desc(newBelieverSessions.sessionDate));

  return { ...enrollment, attendanceHistory };
}

export async function createEnrollment(
  db: Database,
  auth: AuthContext,
  data: { memberId: string; branchId: string; teacherId?: string; mentorId?: string; notes?: string }
) {
  enforceAdminOrPastor(auth);
  enforceBranchScope(auth, data.branchId);
  return createEnrollmentInternal(db, data);
}

/**
 * Gate-free enrollment core. Applies the domain rules (no teacher/mentor self-enrol,
 * no duplicate active enrollment) and creates the row, but performs NO authz check.
 * `createEnrollment` is the role-gated public entry point; internal callers that have
 * already authorized the action by other means (e.g. the open-to-all-members altar-call
 * form flow, which is branch-scoped at the submission boundary) call this directly
 * instead of spoofing an admin auth context.
 */
export async function createEnrollmentInternal(
  db: Database,
  data: { memberId: string; branchId: string; teacherId?: string; mentorId?: string; notes?: string }
) {
  // Block enrolling a teacher as a student in the same branch
  const memberIsTeacher = await isNewBelieverTeacher(db, data.memberId, data.branchId);
  if (memberIsTeacher) {
    throw new ForbiddenError('This member is a New Believers Teacher in this branch and cannot be enrolled as a student');
  }

  // Block enrolling someone who is currently teaching active students in this branch
  const [activeTeaching] = await db
    .select({ id: newBelieverEnrollments.id })
    .from(newBelieverEnrollments)
    .where(
      and(
        eq(newBelieverEnrollments.teacherId, data.memberId),
        eq(newBelieverEnrollments.branchId, data.branchId),
        eq(newBelieverEnrollments.isActive, true),
      )
    )
    .limit(1);
  if (activeTeaching) {
    throw new ForbiddenError('This member is currently teaching active students in this branch and cannot be enrolled as a student');
  }

  // Block enrolling someone who is currently mentoring active students in this branch
  const [activeMentoring] = await db
    .select({ id: newBelieverEnrollments.id })
    .from(newBelieverEnrollments)
    .where(
      and(
        eq(newBelieverEnrollments.mentorId, data.memberId),
        eq(newBelieverEnrollments.branchId, data.branchId),
        eq(newBelieverEnrollments.isActive, true),
      )
    )
    .limit(1);
  if (activeMentoring) {
    throw new ForbiddenError('This member is currently mentoring active students in this branch and cannot be enrolled as a student');
  }

  // Prevent duplicate active enrollment for same member in same branch
  const [existing] = await db
    .select({ id: newBelieverEnrollments.id })
    .from(newBelieverEnrollments)
    .where(
      and(
        eq(newBelieverEnrollments.memberId, data.memberId),
        eq(newBelieverEnrollments.branchId, data.branchId),
        eq(newBelieverEnrollments.isActive, true),
      )
    )
    .limit(1);
  if (existing) throw new ConflictError('This member already has an active new believers enrollment in this branch');

  const [enrollment] = await db
    .insert(newBelieverEnrollments)
    .values({
      memberId: data.memberId,
      branchId: data.branchId,
      teacherId: data.teacherId ?? null,
      mentorId: data.mentorId ?? null,
      notes: data.notes ?? null,
      stage: 'session-1',
    })
    .returning();

  // Send mentor assignment email (fire-and-forget: never blocks enrolment)
  if (data.mentorId && enrollment) {
    const [mentorRows, studentRows] = await Promise.all([
      db.select({ email: members.email, firstName: members.firstName, lastName: members.lastName })
        .from(members).where(eq(members.id, data.mentorId)).limit(1),
      db.select({ firstName: members.firstName, lastName: members.lastName })
        .from(members).where(eq(members.id, data.memberId)).limit(1),
    ]);
    const mentor = mentorRows[0];
    const student = studentRows[0];
    if (mentor?.email) {
      const studentName = student ? `${student.firstName} ${student.lastName}` : 'a new believer';
      sendMentorAssignedEmail(
        mentor.email,
        `${mentor.firstName} ${mentor.lastName}`,
        studentName,
      ).catch((err: unknown) => logger.warn('sendMentorAssignedEmail failed', { error: err instanceof Error ? err.message : String(err) }));
    }
  }

  return enrollment!;
}

export async function updateEnrollment(
  db: Database,
  auth: AuthContext,
  enrollmentId: string,
  data: {
    stage?: string;
    teacherId?: string | null;
    mentorId?: string | null;
    notes?: string | null;
    completedAt?: string | null;
    isActive?: boolean;
    sessionCompletedAt?: Record<string, string> | null;
    sessionFeedback?: Record<string, string> | null;
    joinedDepartmentId?: string | null;
  }
) {
  const [existing] = await db
    .select({
      branchId: newBelieverEnrollments.branchId,
      stage: newBelieverEnrollments.stage,
      sessionCompletedAt: newBelieverEnrollments.sessionCompletedAt,
      sessionFeedback: newBelieverEnrollments.sessionFeedback,
      mentorId: newBelieverEnrollments.mentorId,
      memberId: newBelieverEnrollments.memberId,
    })
    .from(newBelieverEnrollments)
    .where(eq(newBelieverEnrollments.id, enrollmentId))
    .limit(1);
  if (!existing) throw new NotFoundError('Enrollment');

  await enforceTeacherOrAbove(db, auth, existing.branchId);
  enforceBranchScope(auth, existing.branchId);

  // Guard: new teacher must not be a currently active student in this branch
  if (data.teacherId) {
    const [teacherIsStudent] = await db
      .select({ id: newBelieverEnrollments.id })
      .from(newBelieverEnrollments)
      .where(
        and(
          eq(newBelieverEnrollments.memberId, data.teacherId),
          eq(newBelieverEnrollments.branchId, existing.branchId),
          eq(newBelieverEnrollments.isActive, true),
        )
      )
      .limit(1);
    if (teacherIsStudent) {
      throw new ForbiddenError('This member is currently enrolled as a New Believers student and cannot be assigned as a teacher');
    }
  }
  if (
    data.stage &&
    data.stage !== existing.stage &&
    SESSION_STAGES.has(existing.stage) &&
    isForwardStageMove(existing.stage, data.stage)
  ) {
    // Merge incoming sessionCompletedAt with DB state BEFORE the guard check.
    // The client sends stage + sessionCompletedAt in one payload; the DB hasn't been
    // written yet, so existing.sessionCompletedAt won't contain the current session.
    const mergedCompletedMap: Record<string, string> = {
      ...((existing.sessionCompletedAt as Record<string, string>) ?? {}),
      ...(data.sessionCompletedAt ?? {}),
    };
    const mergedFeedbackMap: Record<string, string> = {
      ...((existing.sessionFeedback as Record<string, string>) ?? {}),
      ...(data.sessionFeedback ?? {}),
    };
    if (!mergedCompletedMap[existing.stage]) {
      throw new ForbiddenError(
        `Cannot advance from ${existing.stage} until it has been marked complete. Use "Mark Complete" first.`
      );
    }
    if (!hasSessionFeedback(mergedFeedbackMap, existing.stage)) {
      throw new ForbiddenError(
        `Cannot advance from ${existing.stage} until session feedback has been recorded.`
      );
    }
    if (!(await hasAttendedSessionStage(db, enrollmentId, existing.stage))) {
      throw new ForbiddenError(
        `Cannot advance from ${existing.stage} until attendance has been marked present for that session.`
      );
    }
  }

  const updateValues: Record<string, unknown> = {
    updatedAt: sql`NOW()`,
  };
  if (data.stage !== undefined) updateValues.stage = data.stage;
  if (data.teacherId !== undefined) updateValues.teacherId = data.teacherId;
  if (data.mentorId !== undefined) updateValues.mentorId = data.mentorId;
  if (data.notes !== undefined) updateValues.notes = data.notes;
  if (data.isActive !== undefined) updateValues.isActive = data.isActive;
  if (data.joinedDepartmentId !== undefined) updateValues.joinedDepartmentId = data.joinedDepartmentId;
  if (data.completedAt !== undefined) {
    updateValues.completedAt = data.completedAt ? new Date(data.completedAt) : null;
  }
  // Merge sessionCompletedAt into the existing map
  if (data.sessionCompletedAt !== undefined && data.sessionCompletedAt !== null) {
    const existing_map = (existing.sessionCompletedAt ?? {}) as Record<string, string>;
    updateValues.sessionCompletedAt = { ...existing_map, ...data.sessionCompletedAt };
  }
  // Merge sessionFeedback into the existing map
  if (data.sessionFeedback !== undefined && data.sessionFeedback !== null) {
    const existing_feedback = (existing.sessionFeedback ?? {}) as Record<string, string>;
    updateValues.sessionFeedback = { ...existing_feedback, ...data.sessionFeedback };
  }
  // Auto-set completedAt when stage reaches completed/integrated
  if ((data.stage === 'completed' || data.stage === 'integrated') && data.completedAt === undefined) {
    updateValues.completedAt = new Date();
  }

  // Send mentor assignment email when mentor changes (fire-and-forget: never blocks the update)
  if (data.mentorId !== undefined && data.mentorId !== null && data.mentorId !== existing.mentorId) {
    const [mentorRows, studentRows] = await Promise.all([
      db.select({ email: members.email, firstName: members.firstName, lastName: members.lastName })
        .from(members).where(eq(members.id, data.mentorId)).limit(1),
      db.select({ firstName: members.firstName, lastName: members.lastName })
        .from(members).where(eq(members.id, existing.memberId)).limit(1),
    ]);
    const mentor = mentorRows[0];
    const student = studentRows[0];
    if (mentor?.email) {
      const studentName = student ? `${student.firstName} ${student.lastName}` : 'a student';
      sendMentorAssignedEmail(
        mentor.email,
        `${mentor.firstName} ${mentor.lastName}`,
        studentName,
      ).catch((err: unknown) => logger.warn('sendMentorAssignedEmail failed', { error: err instanceof Error ? err.message : String(err) }));
    }
  }

  const [updated] = await db
    .update(newBelieverEnrollments)
    .set(updateValues)
    .where(eq(newBelieverEnrollments.id, enrollmentId))
    .returning();

  if (data.stage && data.stage !== existing.stage) {
    const [student, actor] = await Promise.all([
      db.select({ firstName: members.firstName, lastName: members.lastName })
        .from(members).where(eq(members.id, existing.memberId)).limit(1),
      db.select({ firstName: members.firstName, lastName: members.lastName })
        .from(members).where(eq(members.id, auth.memberId)).limit(1),
    ]);
    const studentName = student[0]
      ? `${student[0].firstName} ${student[0].lastName ?? ''}`.trim()
      : 'A student';
    const actorName = actor[0]
      ? `${actor[0].firstName} ${actor[0].lastName ?? ''}`.trim()
      : null;

    const recipients = new Set<string>();
    if (existing.mentorId) recipients.add(existing.mentorId);
    const branchAuth = await resolveBranchAuthority(db, existing.branchId);
    branchAuth.forEach((id) => recipients.add(id));
    recipients.delete(auth.memberId);

    await dispatchNotification(db, {
      eventType: NotificationEventType.WorkflowNewBelieverStageMoved,
      recipientMemberIds: Array.from(recipients),
      branchId: existing.branchId,
      subjectType: 'new_believer_enrollment',
      subjectId: enrollmentId,
      payload: {
        studentName,
        fromStage: existing.stage,
        toStage: data.stage,
        changedByName: actorName,
        portalUrl: enrollmentPortalUrl(enrollmentId),
      },
    });
  }

  return updated!;
}

/**
 * Bulk-advance enrollments to a target stage.
 * Calls `updateEnrollment` for each id so all the per-enrollment guards
 * (branch scope, teacher-or-above, session-complete checks, side-effects)
 * still run. Returns the per-id outcome so the caller can render a toast.
 */
export async function bulkAdvance(
  db: Database,
  auth: AuthContext,
  data: { enrollmentIds: string[]; targetStage: string }
): Promise<{ advanced: number; failed: number }> {
  let advanced = 0;
  let failed = 0;
  for (const enrollmentId of data.enrollmentIds) {
    try {
      // Per-session sessionCompletedAt marking is the caller's responsibility;
      // this endpoint advances the stage and relies on the service guard to
      // refuse advancement from a session stage that hasn't been marked complete.
      await updateEnrollment(db, auth, enrollmentId, { stage: data.targetStage });
      advanced++;
    } catch (err) {
      logger.error('bulkAdvance: skipping enrollment', { enrollmentId, error: err instanceof Error ? err.message : String(err) });
      failed++;
    }
  }
  return { advanced, failed };
}

// ── Sessions ───────────────────────────────────────────────

export async function listSessions(
  db: Database,
  auth: AuthContext,
  query: { branchId?: string; upcoming?: boolean }
) {
  const scopedBranchId = auth.systemRole === 'admin' ? query.branchId : auth.branchId;
  if (scopedBranchId) enforceBranchScope(auth, scopedBranchId);

  const conditions: ReturnType<typeof eq>[] = [];
  if (scopedBranchId) conditions.push(eq(newBelieverSessions.branchId, scopedBranchId));
  if (query.upcoming) conditions.push(sql`${newBelieverSessions.sessionDate} >= NOW()`);

  return db
    .select({
      id: newBelieverSessions.id,
      branchId: newBelieverSessions.branchId,
      teacherId: newBelieverSessions.teacherId,
      sessionStage: newBelieverSessions.sessionStage,
      sessionDate: newBelieverSessions.sessionDate,
      topic: newBelieverSessions.topic,
      location: newBelieverSessions.location,
      notes: newBelieverSessions.notes,
      feedback: newBelieverSessions.feedback,
      createdAt: newBelieverSessions.createdAt,
      updatedAt: newBelieverSessions.updatedAt,
      teacherFirstName: sql<string | null>`t.first_name`,
      teacherLastName: sql<string | null>`t.last_name`,
    })
    .from(newBelieverSessions)
    .leftJoin(sql`members t`, sql`${newBelieverSessions.teacherId} = t.id`)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(newBelieverSessions.sessionDate));
}

export async function createSession(
  db: Database,
  auth: AuthContext,
  data: {
    branchId: string;
    sessionStage: string;
    sessionDate: string;
    topic?: string;
    location: string;
    teacherId: string;
    notes?: string;
    feedback?: string;
  }
) {
  await enforceTeacherOrAbove(db, auth, data.branchId);
  enforceBranchScope(auth, data.branchId);
  const topic = SESSION_TOPICS[data.sessionStage] ?? data.topic ?? data.sessionStage;

  const [session] = await db
    .insert(newBelieverSessions)
    .values({
      branchId: data.branchId,
      sessionDate: new Date(data.sessionDate),
      sessionStage: data.sessionStage,
      topic,
      location: data.location,
      teacherId: data.teacherId,
      notes: data.notes ?? null,
      feedback: data.feedback ?? null,
      createdBy: auth.memberId,
    })
    .returning();

  return session!;
}

export async function updateSession(
  db: Database,
  auth: AuthContext,
  sessionId: string,
  data: {
    sessionStage?: string;
    topic?: string;
    sessionDate?: string;
    location?: string | null;
    notes?: string;
    feedback?: string;
    teacherId?: string | null;
  }
) {
  const [session] = await db
    .select({ branchId: newBelieverSessions.branchId, teacherId: newBelieverSessions.teacherId })
    .from(newBelieverSessions)
    .where(eq(newBelieverSessions.id, sessionId))
    .limit(1);
  if (!session) throw new NotFoundError('Session');

  enforceBranchScope(auth, session.branchId);

  // Only the session’s teacher, or admin/pastor, can update
  if (!authHasCapability(auth, 'branch:read')) {
    if (!session.teacherId || session.teacherId !== auth.memberId) {
      throw new ForbiddenError('Only the session teacher, a pastor, or admin can update this session');
    }
  }

  const updateValues: Record<string, unknown> = { updatedAt: sql`NOW()` };
  if (data.sessionStage !== undefined) {
    updateValues.sessionStage = data.sessionStage;
    updateValues.topic = SESSION_TOPICS[data.sessionStage] ?? data.topic;
  } else if (data.topic !== undefined) {
    updateValues.topic = data.topic;
  }
  if (data.sessionDate !== undefined) updateValues.sessionDate = new Date(data.sessionDate);
  if (data.location !== undefined) updateValues.location = data.location;
  if (data.notes !== undefined) updateValues.notes = data.notes;
  if (data.feedback !== undefined) updateValues.feedback = data.feedback;
  if (data.teacherId !== undefined) updateValues.teacherId = data.teacherId;

  const [updated] = await db
    .update(newBelieverSessions)
    .set(updateValues)
    .where(eq(newBelieverSessions.id, sessionId))
    .returning();

  return updated!;
}

export async function recordSessionAttendance(
  db: Database,
  auth: AuthContext,
  sessionId: string,
  records: Array<{ enrollmentId: string; attended: boolean; notes?: string }>
) {
  const [session] = await db
    .select({ branchId: newBelieverSessions.branchId, sessionStage: newBelieverSessions.sessionStage })
    .from(newBelieverSessions)
    .where(eq(newBelieverSessions.id, sessionId))
    .limit(1);
  if (!session) throw new NotFoundError('Session');

  await enforceTeacherOrAbove(db, auth, session.branchId);
  enforceBranchScope(auth, session.branchId);

  // Upsert all records
  for (const record of records) {
    const [enrollment] = await db
      .select({
        branchId: newBelieverEnrollments.branchId,
        stage: newBelieverEnrollments.stage,
        isActive: newBelieverEnrollments.isActive,
      })
      .from(newBelieverEnrollments)
      .where(eq(newBelieverEnrollments.id, record.enrollmentId))
      .limit(1);
    if (!enrollment) throw new NotFoundError('Enrollment');
    if (enrollment.branchId !== session.branchId) {
      throw new ForbiddenError('Attendance can only be recorded for enrollments in the session branch');
    }
    const [existingAttendance] = await db
      .select({ enrollmentId: newBelieverAttendance.enrollmentId })
      .from(newBelieverAttendance)
      .where(
        and(
          eq(newBelieverAttendance.sessionId, sessionId),
          eq(newBelieverAttendance.enrollmentId, record.enrollmentId),
        )
      )
      .limit(1);
    if ((!enrollment.isActive || enrollment.stage !== session.sessionStage) && !existingAttendance) {
      throw new ForbiddenError(
        `Attendance for this session can only be recorded for active ${session.sessionStage} enrollments`
      );
    }

    await db
      .insert(newBelieverAttendance)
      .values({
        sessionId,
        enrollmentId: record.enrollmentId,
        attended: record.attended,
        notes: record.notes ?? null,
        recordedBy: auth.memberId,
        recordedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [newBelieverAttendance.sessionId, newBelieverAttendance.enrollmentId],
        set: {
          attended: record.attended,
          notes: record.notes ?? null,
          recordedBy: auth.memberId,
          recordedAt: new Date(),
        },
      });
  }

  return { recorded: records.length };
}

export async function getSessionAttendance(
  db: Database,
  auth: AuthContext,
  sessionId: string
) {
  const [session] = await db
    .select({ branchId: newBelieverSessions.branchId })
    .from(newBelieverSessions)
    .where(eq(newBelieverSessions.id, sessionId))
    .limit(1);
  if (!session) throw new NotFoundError('Session');

  enforceBranchScope(auth, session.branchId);

  return db
    .select({
      sessionId: newBelieverAttendance.sessionId,
      enrollmentId: newBelieverAttendance.enrollmentId,
      attended: newBelieverAttendance.attended,
      notes: newBelieverAttendance.notes,
      recordedAt: newBelieverAttendance.recordedAt,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
    })
    .from(newBelieverAttendance)
    .innerJoin(newBelieverEnrollments, eq(newBelieverAttendance.enrollmentId, newBelieverEnrollments.id))
    .innerJoin(members, eq(newBelieverEnrollments.memberId, members.id))
    .where(eq(newBelieverAttendance.sessionId, sessionId))
    .orderBy(members.lastName, members.firstName);
}

// ── Health summary ────────────────────────────────────────

export type StageFunnel = Record<(typeof STAGE_ORDER)[number], number>;

export interface AttendanceTrendPoint {
  sessionId: string;
  sessionDate: string;
  sessionStage: string;
  topic: string | null;
  attended: number;
  eligible: number;
  attendanceRate: number;
}

export interface HealthSummary {
  attendanceTrend: AttendanceTrendPoint[];
  stageFunnel: StageFunnel;
  stale: { count: number; thresholdDays: number };
  summary: { avgAttendanceRate: number | null; activeEnrollments: number };
}

/**
 * Aggregated programme-health metrics for the New Believers Sessions page.
 *
 * - Trend: last 8 sessions in the branch, newest-first, with attended/eligible counts.
 * - Funnel: counts of active enrollments per stage (all 7 stages present, missing → 0).
 * - Stale: count of stale enrollments via shared {@link staleEnrollmentCondition}.
 * - Summary: average attendance rate across the window + total active enrollments.
 *
 * Branch scope mirrors {@link listEnrollments}: non-admin/non-pastor callers are
 * silently coerced to `auth.branchId` (no leak even if the query asks otherwise).
 */
export async function getHealthSummary(
  db: Database,
  auth: AuthContext,
  query: { branchId?: string },
): Promise<HealthSummary> {
  const scopedBranchId =
    authHasCapability(auth, 'branch:read')
      ? query.branchId
      : auth.branchId;

  if (scopedBranchId && !authHasCapability(auth, 'branch:read')) {
    enforceBranchScope(auth, scopedBranchId);
  }

  const trendConditions = scopedBranchId
    ? [eq(newBelieverSessions.branchId, scopedBranchId)]
    : [];
  const enrollmentBranchConditions = scopedBranchId
    ? [eq(newBelieverEnrollments.branchId, scopedBranchId)]
    : [];

  const [trendRows, funnelRows, staleAndActiveRows] = await Promise.all([
    db
      .select({
        sessionId: newBelieverSessions.id,
        sessionDate: newBelieverSessions.sessionDate,
        sessionStage: newBelieverSessions.sessionStage,
        topic: newBelieverSessions.topic,
        attended: sql<number>`COALESCE(SUM(CASE WHEN ${newBelieverAttendance.attended} = true THEN 1 ELSE 0 END), 0)`,
        eligible: sql<number>`COALESCE(COUNT(${newBelieverAttendance.enrollmentId}), 0)`,
      })
      .from(newBelieverSessions)
      .leftJoin(
        newBelieverAttendance,
        eq(newBelieverAttendance.sessionId, newBelieverSessions.id),
      )
      .where(trendConditions.length > 0 ? and(...trendConditions) : undefined)
      .groupBy(
        newBelieverSessions.id,
        newBelieverSessions.sessionDate,
        newBelieverSessions.sessionStage,
        newBelieverSessions.topic,
      )
      .orderBy(desc(newBelieverSessions.sessionDate))
      .limit(8),
    db
      .select({
        stage: newBelieverEnrollments.stage,
        count: count(),
      })
      .from(newBelieverEnrollments)
      .where(
        and(
          eq(newBelieverEnrollments.isActive, true),
          ...enrollmentBranchConditions,
        ),
      )
      .groupBy(newBelieverEnrollments.stage),
    db
      .select({
        staleCount: sql<number>`COALESCE(SUM(CASE
          WHEN ${newBelieverEnrollments.isActive} = true
            AND ${newBelieverEnrollments.stage} NOT IN ('completed', 'integrated')
            AND ${newBelieverEnrollments.updatedAt} < NOW() - INTERVAL '${sql.raw(String(STALE_THRESHOLD_DAYS))} days'
          THEN 1 ELSE 0 END), 0)`,
        activeCount: sql<number>`COALESCE(SUM(CASE
          WHEN ${newBelieverEnrollments.isActive} = true
            AND ${newBelieverEnrollments.stage} != 'integrated'
          THEN 1 ELSE 0 END), 0)`,
      })
      .from(newBelieverEnrollments)
      .where(
        enrollmentBranchConditions.length > 0
          ? and(...enrollmentBranchConditions)
          : undefined,
      ),
  ]);

  const attendanceTrend: AttendanceTrendPoint[] = (trendRows as Array<{
    sessionId: string;
    sessionDate: string | Date;
    sessionStage: string;
    topic: string | null;
    attended: number | string;
    eligible: number | string;
  }>).map((row) => {
    const attended = Number(row.attended ?? 0);
    const eligible = Number(row.eligible ?? 0);
    const attendanceRate = eligible > 0 ? attended / eligible : 0;
    return {
      sessionId: row.sessionId,
      sessionDate:
        row.sessionDate instanceof Date
          ? row.sessionDate.toISOString()
          : String(row.sessionDate),
      sessionStage: row.sessionStage,
      topic: row.topic,
      attended,
      eligible,
      attendanceRate,
    };
  });

  // Fill all 7 stages with 0 by default, then overlay actual counts.
  const stageFunnel = STAGE_ORDER.reduce<StageFunnel>((acc, stage) => {
    acc[stage] = 0;
    return acc;
  }, { } as StageFunnel);
  for (const row of funnelRows as Array<{ stage: string; count: number | string }>) {
    if ((STAGE_ORDER as readonly string[]).includes(row.stage)) {
      stageFunnel[row.stage as (typeof STAGE_ORDER)[number]] = Number(row.count ?? 0);
    }
  }

  const counts = (staleAndActiveRows as Array<{ staleCount: number | string; activeCount: number | string }>)[0]
    ?? { staleCount: 0, activeCount: 0 };
  const staleCount = Number(counts.staleCount ?? 0);
  const activeEnrollments = Number(counts.activeCount ?? 0);

  const avgAttendanceRate =
    attendanceTrend.length > 0
      ? attendanceTrend.reduce((sum, point) => sum + point.attendanceRate, 0) /
        attendanceTrend.length
      : null;

  return {
    attendanceTrend,
    stageFunnel,
    stale: { count: staleCount, thresholdDays: STALE_THRESHOLD_DAYS },
    summary: { avgAttendanceRate, activeEnrollments },
  };
}

// ── Auto-enroll helper (called from souls-update-status & altar-call form) ──

export async function autoEnroll(
  db: Database,
  memberId: string,
  branchId: string,
): Promise<void> {
  // Idempotent — skip if already has active enrollment
  const [existing] = await db
    .select({ id: newBelieverEnrollments.id })
    .from(newBelieverEnrollments)
    .where(
      and(
        eq(newBelieverEnrollments.memberId, memberId),
        eq(newBelieverEnrollments.branchId, branchId),
        eq(newBelieverEnrollments.isActive, true),
      )
    )
    .limit(1);

  if (!existing) {
    await db.insert(newBelieverEnrollments).values({
      memberId,
      branchId,
      stage: 'session-1',
    });
  }
}

// ── Mentor follow-ups ─────────────────────────────────────

/**
 * Whether the caller can write a mentor follow-up against `enrollmentId`.
 * Allowed: the assigned mentor on the row, the NB-dept leader, the NB-Teacher
 * role holder, pastor, or admin. Anyone else → ForbiddenError.
 */
async function enforceMentorFollowupWrite(
  db: Database,
  auth: AuthContext,
  enrollment: { id: string; branchId: string; mentorId: string | null },
) {
  enforceBranchScope(auth, enrollment.branchId);
  if (authHasCapability(auth, 'branch:read')) return;
  if (enrollment.mentorId === auth.memberId) return;
  const [isNbLeader, hasTeacherRole] = await Promise.all([
    isNewBelieversDeptLeader(db, auth.memberId, enrollment.branchId),
    isNewBelieverTeacher(db, auth.memberId, enrollment.branchId),
  ]);
  if (!isNbLeader && !hasTeacherRole) {
    throw new ForbiddenError('Only the assigned mentor, NB leader, or pastor/admin can write follow-ups');
  }
}

export async function listMentorFollowups(
  db: Database,
  auth: AuthContext,
  enrollmentId: string,
) {
  // Read access piggy-backs on getEnrollment's persona scope (throws on cross-persona)
  await getEnrollment(db, auth, enrollmentId);

  const rows = await db
    .select({
      id: mentorFollowups.id,
      enrollmentId: mentorFollowups.enrollmentId,
      mentorMemberId: mentorFollowups.mentorMemberId,
      note: mentorFollowups.note,
      contactedAt: mentorFollowups.contactedAt,
      createdBy: mentorFollowups.createdBy,
      isActive: mentorFollowups.isActive,
      createdAt: mentorFollowups.createdAt,
      updatedAt: mentorFollowups.updatedAt,
      mentorFirstName: members.firstName,
      mentorLastName: members.lastName,
    })
    .from(mentorFollowups)
    .leftJoin(members, eq(mentorFollowups.mentorMemberId, members.id))
    .where(and(eq(mentorFollowups.enrollmentId, enrollmentId), eq(mentorFollowups.isActive, true)))
    .orderBy(desc(mentorFollowups.contactedAt));
  return rows;
}

export async function createMentorFollowup(
  db: Database,
  auth: AuthContext,
  enrollmentId: string,
  data: { note: string; contactedAt?: string },
) {
  const [enrollment] = await db
    .select({
      id: newBelieverEnrollments.id,
      branchId: newBelieverEnrollments.branchId,
      mentorId: newBelieverEnrollments.mentorId,
    })
    .from(newBelieverEnrollments)
    .where(eq(newBelieverEnrollments.id, enrollmentId))
    .limit(1);
  if (!enrollment) throw new NotFoundError('Enrollment');

  await enforceMentorFollowupWrite(db, auth, enrollment);

  // The followup author is the mentor on the row by default; if a non-mentor
  // (NB-leader / pastor / admin) writes it on behalf of someone, the row still
  // records the assigned mentor so the audit trail follows the mentee, not
  // whoever happened to be filling in the form.
  const mentorMemberId = enrollment.mentorId ?? auth.memberId;

  const [created] = await db
    .insert(mentorFollowups)
    .values({
      enrollmentId,
      mentorMemberId,
      note: data.note,
      contactedAt: data.contactedAt ? new Date(data.contactedAt) : new Date(),
      createdBy: auth.memberId,
    })
    .returning();
  return created;
}

export async function deleteMentorFollowup(
  db: Database,
  auth: AuthContext,
  followupId: string,
) {
  const [row] = await db
    .select({
      id: mentorFollowups.id,
      enrollmentId: mentorFollowups.enrollmentId,
      createdBy: mentorFollowups.createdBy,
    })
    .from(mentorFollowups)
    .where(eq(mentorFollowups.id, followupId))
    .limit(1);
  if (!row) throw new NotFoundError('Follow-up');

  const [enrollment] = await db
    .select({
      id: newBelieverEnrollments.id,
      branchId: newBelieverEnrollments.branchId,
      mentorId: newBelieverEnrollments.mentorId,
    })
    .from(newBelieverEnrollments)
    .where(eq(newBelieverEnrollments.id, row.enrollmentId))
    .limit(1);
  if (!enrollment) throw new NotFoundError('Enrollment');

  enforceBranchScope(auth, enrollment.branchId);

  // Only the author, NB-dept leader, pastor, or admin can soft-delete.
  if (!authHasCapability(auth, 'branch:read') && row.createdBy !== auth.memberId) {
    const isNbLeader = await isNewBelieversDeptLeader(db, auth.memberId, enrollment.branchId);
    if (!isNbLeader) {
      throw new ForbiddenError('Only the author, NB leader, or pastor/admin can delete this follow-up');
    }
  }

  await db
    .update(mentorFollowups)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(mentorFollowups.id, followupId));
  return { id: followupId };
}

/**
 * Remove an enrollment from the pipeline with a captured reason. Distinct from
 * a silent PATCH { isActive: false } — this endpoint requires a reason and
 * fans a workflow notification to the mentor + branch authority so the
 * departure isn't invisible to the wider leadership.
 *
 * No-op if the enrollment is already inactive (idempotent) — the guard
 * returns the existing row without re-firing notifications.
 */
export async function removeFromPipeline(
  db: Database,
  auth: AuthContext,
  enrollmentId: string,
  input: { reason: string; notes?: string },
) {
  const [existing] = await db
    .select({
      id: newBelieverEnrollments.id,
      branchId: newBelieverEnrollments.branchId,
      memberId: newBelieverEnrollments.memberId,
      mentorId: newBelieverEnrollments.mentorId,
      isActive: newBelieverEnrollments.isActive,
    })
    .from(newBelieverEnrollments)
    .where(eq(newBelieverEnrollments.id, enrollmentId))
    .limit(1);
  if (!existing) throw new NotFoundError('Enrollment');

  await enforceTeacherOrAbove(db, auth, existing.branchId);
  enforceBranchScope(auth, existing.branchId);

  if (!existing.isActive) {
    // Already removed — surface the row without re-firing dispatch.
    const [row] = await db
      .select()
      .from(newBelieverEnrollments)
      .where(eq(newBelieverEnrollments.id, enrollmentId))
      .limit(1);
    return row;
  }

  const [updated] = await db
    .update(newBelieverEnrollments)
    .set({
      isActive: false,
      removalReason: input.reason,
      removalNotes: input.notes ?? null,
      updatedAt: sql`NOW()`,
    })
    .where(eq(newBelieverEnrollments.id, enrollmentId))
    .returning();

  // Fire-and-forget workflow notification. Notification failures must not
  // roll back the removal.
  try {
    const [student, actor, branchAuth] = await Promise.all([
      db
        .select({ firstName: members.firstName, lastName: members.lastName })
        .from(members)
        .where(eq(members.id, existing.memberId))
        .limit(1),
      db
        .select({ firstName: members.firstName, lastName: members.lastName })
        .from(members)
        .where(eq(members.id, auth.memberId))
        .limit(1),
      resolveBranchAuthority(db, existing.branchId),
    ]);
    const studentName = student[0]
      ? `${student[0].firstName} ${student[0].lastName ?? ''}`.trim()
      : 'Student';
    const removedByName = actor[0]
      ? `${actor[0].firstName} ${actor[0].lastName ?? ''}`.trim()
      : null;
    const recipients = Array.from(
      new Set([...(existing.mentorId ? [existing.mentorId] : []), ...branchAuth]),
    );
    if (recipients.length > 0) {
      await dispatchNotification(db, {
        eventType: NotificationEventType.WorkflowNewBelieverRemoved,
        recipientMemberIds: recipients,
        branchId: existing.branchId,
        subjectType: 'nb_enrollment',
        subjectId: existing.id,
        payload: {
          studentName,
          reason: input.reason,
          notes: input.notes ?? null,
          removedByName,
          portalUrl: enrollmentPortalUrl(existing.id),
        },
      });
    }
  } catch (err) {
    logger.error('nb: removeFromPipeline notification failed', {
      enrollmentId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return updated;
}

import { eq, and, asc, desc, lt, sql, count } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  newBelieverEnrollments,
  newBelieverSessions,
  newBelieverAttendance,
  members,
  memberRoles,
  roles,
} from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import { NotFoundError, ForbiddenError, ConflictError, sendMentorAssignedEmail } from '@kairos/utils';

// ── Helpers ────────────────────────────────────────────────

function enforceAdminOrPastor(auth: AuthContext) {
  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor') {
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

async function enforceTeacherOrAbove(db: Database, auth: AuthContext, branchId: string) {
  if (auth.systemRole === 'admin' || auth.systemRole === 'pastor') return;
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

  const conditions: ReturnType<typeof eq>[] = [];
  if (scopedBranchId) conditions.push(eq(newBelieverEnrollments.branchId, scopedBranchId));
  if (query.stage) conditions.push(eq(newBelieverEnrollments.stage, query.stage));
  if (query.teacherId) conditions.push(eq(newBelieverEnrollments.teacherId, query.teacherId));
  if (query.stale) {
    // Stale = no update in 7 days and not yet completed/integrated
    conditions.push(lt(newBelieverEnrollments.updatedAt, sql`NOW() - INTERVAL '7 days'`));
    conditions.push(sql`${newBelieverEnrollments.stage} NOT IN ('completed', 'integrated')`);
  }
  conditions.push(eq(newBelieverEnrollments.isActive, true));

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
      ).catch((err: unknown) => console.warn('[mailer] sendMentorAssignedEmail failed:', err));
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
      ).catch((err: unknown) => console.warn('[mailer] sendMentorAssignedEmail failed:', err));
    }
  }

  const [updated] = await db
    .update(newBelieverEnrollments)
    .set(updateValues)
    .where(eq(newBelieverEnrollments.id, enrollmentId))
    .returning();

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
      console.error('bulkAdvance: skipping enrollment', { enrollmentId, err });
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
  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor') {
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

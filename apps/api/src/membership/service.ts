import { eq, and, or, asc, desc, ilike, inArray, sql, count } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  membershipCohorts,
  membershipCohortTeachers,
  membershipSessions,
  membershipEnrollments,
  membershipSessionRecords,
  members,
  branches,
} from '@kairos/database';
import type {
  AuthContext,
  MembershipGraduationReadiness,
  MembershipSessionNumber,
} from '@kairos/types';
import { evaluateGraduationReadiness } from '@kairos/types';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '@kairos/utils';
import { authHasCapability } from '../lib/grants';
import { setMembershipClassCompleted } from '../members/service';
import type { z } from 'zod';
import type {
  createCohortSchema,
  updateCohortSchema,
  listCohortsQuerySchema,
  upsertSessionSchema,
  assignTeacherSchema,
  enrolMembersSchema,
  saveSessionRecordsSchema,
  recordFinalTestSchema,
  recordInductionSchema,
  graduateSchema,
  withdrawEnrollmentSchema,
  listEnrollmentsQuerySchema,
} from './schemas';

// ── Authority ─────────────────────────────────────────────────────────────
//
// Membership cohorts are CHURCH-WIDE, so the branch-scoped RBAC grants used
// everywhere else in the API cannot express authority over them. Two rules
// replace them:
//
//   1. Cohort administration (create, edit, schedule, enrol others, graduate)
//      is platform-admin only — `systemRole === 'admin'` is the only
//      church-wide authority the model has.
//   2. Marking (attendance, homework, quiz, final test, induction) is allowed
//      for a platform admin OR anyone holding a `membership_cohort_teachers`
//      row for that cohort. Teachership is the table, not a grant.
//
// Do not "fix" this by inventing a branch-scoped MembershipTeacher grant: a
// branch scope cannot describe a church-wide cohort.

function enforceCohortAdmin(auth: AuthContext): void {
  if (auth.systemRole !== 'admin') {
    throw new ForbiddenError('Only platform admins can administer membership cohorts');
  }
}

async function isCohortTeacher(
  db: Database,
  cohortId: string,
  memberId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ memberId: membershipCohortTeachers.memberId })
    .from(membershipCohortTeachers)
    .where(
      and(
        eq(membershipCohortTeachers.cohortId, cohortId),
        eq(membershipCohortTeachers.memberId, memberId),
      ),
    )
    .limit(1);
  return !!row;
}

async function enforceCanMark(
  db: Database,
  auth: AuthContext,
  cohortId: string,
): Promise<void> {
  if (auth.systemRole === 'admin') return;
  if (await isCohortTeacher(db, cohortId, auth.memberId)) return;
  throw new ForbiddenError('Only a teacher on this cohort can record marks');
}

// ── Cohorts ───────────────────────────────────────────────────────────────

export async function listCohorts(
  db: Database,
  _auth: AuthContext,
  query: z.infer<typeof listCohortsQuerySchema>,
) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 25;

  const conditions = [];
  if (!query.includeInactive) conditions.push(eq(membershipCohorts.isActive, true));
  if (query.status) conditions.push(eq(membershipCohorts.status, query.status));
  if (query.enrolmentOpen !== undefined) {
    conditions.push(eq(membershipCohorts.enrolmentOpen, query.enrolmentOpen));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select({
      cohort: membershipCohorts,
      enrolledCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${membershipEnrollments}
        WHERE ${membershipEnrollments.cohortId} = ${membershipCohorts.id}
          AND ${membershipEnrollments.status} = 'enrolled'
      )`,
      graduatedCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${membershipEnrollments}
        WHERE ${membershipEnrollments.cohortId} = ${membershipCohorts.id}
          AND ${membershipEnrollments.status} = 'graduated'
      )`,
      teacherCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${membershipCohortTeachers}
        WHERE ${membershipCohortTeachers.cohortId} = ${membershipCohorts.id}
      )`,
      sessionCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${membershipSessions}
        WHERE ${membershipSessions.cohortId} = ${membershipCohorts.id}
      )`,
    })
    .from(membershipCohorts)
    .where(where)
    .orderBy(desc(membershipCohorts.startDate))
    .limit(limit)
    .offset((page - 1) * limit);

  const [total] = await db.select({ value: count() }).from(membershipCohorts).where(where);

  return {
    cohorts: rows.map((r) => ({
      ...r.cohort,
      enrolledCount: r.enrolledCount,
      graduatedCount: r.graduatedCount,
      teacherCount: r.teacherCount,
      sessionCount: r.sessionCount,
    })),
    pagination: {
      page,
      limit,
      total: total?.value ?? 0,
      totalPages: Math.ceil((total?.value ?? 0) / limit),
    },
  };
}

export async function getCohort(db: Database, _auth: AuthContext, cohortId: string) {
  const [cohort] = await db
    .select()
    .from(membershipCohorts)
    .where(eq(membershipCohorts.id, cohortId))
    .limit(1);
  if (!cohort) throw new NotFoundError('Cohort not found');

  const teachers = await db
    .select({
      cohortId: membershipCohortTeachers.cohortId,
      memberId: membershipCohortTeachers.memberId,
      role: membershipCohortTeachers.role,
      assignedAt: membershipCohortTeachers.assignedAt,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      memberEmail: members.email,
    })
    .from(membershipCohortTeachers)
    .innerJoin(members, eq(membershipCohortTeachers.memberId, members.id))
    .where(eq(membershipCohortTeachers.cohortId, cohortId))
    .orderBy(asc(membershipCohortTeachers.role), asc(members.lastName));

  const sessions = await listSessions(db, cohortId);

  return { ...cohort, teachers, sessions };
}

export async function createCohort(
  db: Database,
  auth: AuthContext,
  input: z.infer<typeof createCohortSchema>,
) {
  enforceCohortAdmin(auth);
  await assertNameFree(db, input.name, null);

  const [created] = await db
    .insert(membershipCohorts)
    .values({
      name: input.name.trim(),
      description: input.description ?? null,
      startDate: input.startDate,
      graduationDate: input.graduationDate ?? null,
      finalTestDeadline: input.finalTestDeadline ?? null,
      status: input.status ?? 'planned',
      enrolmentOpen: input.enrolmentOpen ?? true,
      homeworkPassMark: input.homeworkPassMark ?? 50,
      quizPassMark: input.quizPassMark ?? 50,
      finalTestPassMark: input.finalTestPassMark ?? 50,
      notes: input.notes ?? null,
      createdBy: auth.memberId,
    })
    .returning();

  return created;
}

export async function updateCohort(
  db: Database,
  auth: AuthContext,
  cohortId: string,
  input: z.infer<typeof updateCohortSchema>,
) {
  enforceCohortAdmin(auth);
  const cohort = await requireCohort(db, cohortId);
  if (input.name && input.name.trim().toLowerCase() !== cohort.name.toLowerCase()) {
    await assertNameFree(db, input.name, cohortId);
  }

  const [updated] = await db
    .update(membershipCohorts)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
      ...(input.graduationDate !== undefined ? { graduationDate: input.graduationDate } : {}),
      ...(input.finalTestDeadline !== undefined
        ? { finalTestDeadline: input.finalTestDeadline }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.enrolmentOpen !== undefined ? { enrolmentOpen: input.enrolmentOpen } : {}),
      ...(input.homeworkPassMark !== undefined
        ? { homeworkPassMark: input.homeworkPassMark }
        : {}),
      ...(input.quizPassMark !== undefined ? { quizPassMark: input.quizPassMark } : {}),
      ...(input.finalTestPassMark !== undefined
        ? { finalTestPassMark: input.finalTestPassMark }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      updatedAt: sql`NOW()`,
    })
    .where(eq(membershipCohorts.id, cohortId))
    .returning();

  return updated;
}

/** Soft delete, matching the rest of the codebase. History is never removed. */
export async function archiveCohort(db: Database, auth: AuthContext, cohortId: string) {
  enforceCohortAdmin(auth);
  await requireCohort(db, cohortId);

  const [{ value: openCount } = { value: 0 }] = await db
    .select({ value: count() })
    .from(membershipEnrollments)
    .where(
      and(
        eq(membershipEnrollments.cohortId, cohortId),
        eq(membershipEnrollments.status, 'enrolled'),
      ),
    );
  if (openCount > 0) {
    throw new ConflictError(
      `Cohort still has ${openCount} enrolled member${openCount === 1 ? '' : 's'}. Graduate or withdraw them first.`,
    );
  }

  const [updated] = await db
    .update(membershipCohorts)
    .set({ isActive: false, status: 'cancelled', updatedAt: sql`NOW()` })
    .where(eq(membershipCohorts.id, cohortId))
    .returning();
  return updated;
}

// ── Teachers ──────────────────────────────────────────────────────────────

export async function assignTeacher(
  db: Database,
  auth: AuthContext,
  cohortId: string,
  input: z.infer<typeof assignTeacherSchema>,
) {
  enforceCohortAdmin(auth);
  await requireCohort(db, cohortId);

  const [member] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.id, input.memberId), eq(members.isActive, true)))
    .limit(1);
  if (!member) throw new NotFoundError('Member not found');

  const [row] = await db
    .insert(membershipCohortTeachers)
    .values({
      cohortId,
      memberId: input.memberId,
      role: input.role ?? 'teacher',
      assignedBy: auth.memberId,
    })
    .onConflictDoUpdate({
      target: [membershipCohortTeachers.cohortId, membershipCohortTeachers.memberId],
      set: { role: input.role ?? 'teacher' },
    })
    .returning();

  return row;
}

export async function removeTeacher(
  db: Database,
  auth: AuthContext,
  cohortId: string,
  memberId: string,
) {
  enforceCohortAdmin(auth);
  await requireCohort(db, cohortId);
  await db
    .delete(membershipCohortTeachers)
    .where(
      and(
        eq(membershipCohortTeachers.cohortId, cohortId),
        eq(membershipCohortTeachers.memberId, memberId),
      ),
    );
  return { removed: true };
}

// ── Sessions ──────────────────────────────────────────────────────────────

export async function listSessions(db: Database, cohortId: string) {
  const rows = await db
    .select({
      session: membershipSessions,
      teacherFirstName: members.firstName,
      teacherLastName: members.lastName,
    })
    .from(membershipSessions)
    .leftJoin(members, eq(membershipSessions.teacherId, members.id))
    .where(eq(membershipSessions.cohortId, cohortId))
    .orderBy(asc(membershipSessions.sessionNumber));

  return rows.map((r) => ({
    ...r.session,
    sessionNumber: r.session.sessionNumber as MembershipSessionNumber,
    teacherFirstName: r.teacherFirstName,
    teacherLastName: r.teacherLastName,
  }));
}

/**
 * Sessions are addressed by their number within the cohort, so this is an
 * upsert rather than a create — there is exactly one session 3 per cohort and
 * scheduling it twice should move it, not duplicate it.
 */
export async function upsertSession(
  db: Database,
  auth: AuthContext,
  cohortId: string,
  input: z.infer<typeof upsertSessionSchema>,
) {
  enforceCohortAdmin(auth);
  await requireCohort(db, cohortId);

  const [row] = await db
    .insert(membershipSessions)
    .values({
      cohortId,
      sessionNumber: input.sessionNumber,
      title: input.title,
      sessionDate: input.sessionDate ? new Date(input.sessionDate) : null,
      location: input.location ?? null,
      teacherId: input.teacherId ?? null,
      notes: input.notes ?? null,
    })
    .onConflictDoUpdate({
      target: [membershipSessions.cohortId, membershipSessions.sessionNumber],
      set: {
        title: input.title,
        sessionDate: input.sessionDate ? new Date(input.sessionDate) : null,
        location: input.location ?? null,
        teacherId: input.teacherId ?? null,
        notes: input.notes ?? null,
        updatedAt: sql`NOW()`,
      },
    })
    .returning();

  return row;
}

// ── Enrolment ─────────────────────────────────────────────────────────────

/**
 * Self-enrolment. Cohorts are church-wide and people sign up whenever they
 * want, so this is a first-class flow rather than an admin-only action.
 */
export async function enrolSelf(db: Database, auth: AuthContext, cohortId: string) {
  const cohort = await requireCohort(db, cohortId);
  if (!cohort.enrolmentOpen) {
    throw new ConflictError('This cohort is not accepting enrolments');
  }
  if (cohort.status === 'completed' || cohort.status === 'cancelled') {
    throw new ConflictError(`This cohort is ${cohort.status}`);
  }
  const [created] = await enrolMemberIds(db, cohortId, [auth.memberId], true);
  return created;
}

export async function enrolMembers(
  db: Database,
  auth: AuthContext,
  cohortId: string,
  input: z.infer<typeof enrolMembersSchema>,
) {
  enforceCohortAdmin(auth);
  const cohort = await requireCohort(db, cohortId);
  if (cohort.status === 'completed' || cohort.status === 'cancelled') {
    throw new ConflictError(`This cohort is ${cohort.status}`);
  }
  return enrolMemberIds(db, cohortId, input.memberIds, false);
}

async function enrolMemberIds(
  db: Database,
  cohortId: string,
  memberIds: string[],
  selfEnrolled: boolean,
) {
  const rows = await db
    .select({
      id: members.id,
      homeBranchId: members.homeBranchId,
      completedAt: members.membershipClassCompletedAt,
    })
    .from(members)
    .where(and(inArray(members.id, memberIds), eq(members.isActive, true)));

  if (rows.length === 0) throw new NotFoundError('No matching active members');

  // Already a confirmed Member — enrolling them again would be a no-op at best
  // and a duplicate certification at worst.
  const alreadyConfirmed = rows.filter((r) => r.completedAt);
  if (alreadyConfirmed.length > 0 && selfEnrolled) {
    throw new ConflictError('You have already completed the membership class');
  }

  const enrollable = rows.filter((r) => !r.completedAt);
  if (enrollable.length === 0) {
    throw new ConflictError('Every selected member has already completed the class');
  }

  // The partial unique index allows only one open enrolment per member, so a
  // member sitting in another cohort surfaces here rather than as a 500.
  const openElsewhere = await db
    .select({ memberId: membershipEnrollments.memberId })
    .from(membershipEnrollments)
    .where(
      and(
        inArray(
          membershipEnrollments.memberId,
          enrollable.map((r) => r.id),
        ),
        eq(membershipEnrollments.status, 'enrolled'),
        sql`${membershipEnrollments.cohortId} <> ${cohortId}`,
      ),
    );
  if (openElsewhere.length > 0) {
    throw new ConflictError(
      selfEnrolled
        ? 'You are already enrolled in another membership cohort'
        : `${openElsewhere.length} selected member(s) are already enrolled in another cohort`,
    );
  }

  const created = await db
    .insert(membershipEnrollments)
    .values(
      enrollable.map((r) => ({
        cohortId,
        memberId: r.id,
        branchId: r.homeBranchId,
        selfEnrolled,
      })),
    )
    // Re-enrolling into the same cohort is idempotent rather than an error.
    .onConflictDoNothing({
      target: [membershipEnrollments.cohortId, membershipEnrollments.memberId],
    })
    .returning();

  return created;
}

export async function listEnrollments(
  db: Database,
  auth: AuthContext,
  cohortId: string,
  query: z.infer<typeof listEnrollmentsQuerySchema>,
) {
  await requireCohort(db, cohortId);

  const conditions = [eq(membershipEnrollments.cohortId, cohortId)];
  if (query.status) conditions.push(eq(membershipEnrollments.status, query.status));
  if (query.branchId) conditions.push(eq(membershipEnrollments.branchId, query.branchId));
  if (query.search) {
    const term = `%${query.search}%`;
    conditions.push(
      or(ilike(members.firstName, term), ilike(members.lastName, term)) ??
        sql`TRUE`,
    );
  }

  // A cohort is church-wide, but a non-admin leader should only see the people
  // whose home branch they have authority over. Admins and cohort teachers see
  // the whole roster, since teaching it requires seeing it.
  const teaches = auth.systemRole === 'admin' || (await isCohortTeacher(db, cohortId, auth.memberId));
  if (!teaches) {
    if (!authHasCapability(auth, 'branch:write')) {
      throw new ForbiddenError('You do not have access to this cohort roster');
    }
    conditions.push(eq(membershipEnrollments.branchId, auth.branchId));
  }

  const rows = await db
    .select({
      enrollment: membershipEnrollments,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      memberEmail: members.email,
      branchName: branches.branchName,
    })
    .from(membershipEnrollments)
    .innerJoin(members, eq(membershipEnrollments.memberId, members.id))
    .leftJoin(branches, eq(membershipEnrollments.branchId, branches.id))
    .where(and(...conditions))
    .orderBy(asc(members.lastName), asc(members.firstName));

  return rows.map((r) => ({
    ...r.enrollment,
    memberFirstName: r.memberFirstName,
    memberLastName: r.memberLastName,
    memberEmail: r.memberEmail,
    branchName: r.branchName,
  }));
}

export async function withdrawEnrollment(
  db: Database,
  auth: AuthContext,
  enrollmentId: string,
  input: z.infer<typeof withdrawEnrollmentSchema>,
) {
  const enrollment = await requireEnrollment(db, enrollmentId);
  // A member may withdraw themselves; otherwise it is an admin action.
  if (enrollment.memberId !== auth.memberId) enforceCohortAdmin(auth);
  if (enrollment.status === 'graduated') {
    throw new ConflictError('A graduated enrolment cannot be withdrawn');
  }

  const [updated] = await db
    .update(membershipEnrollments)
    .set({
      status: input.reason === 'deferred_to_next' ? 'deferred' : 'withdrawn',
      withdrawnReason: input.reason,
      notes: input.notes ?? enrollment.notes,
      updatedAt: sql`NOW()`,
    })
    .where(eq(membershipEnrollments.id, enrollmentId))
    .returning();

  return updated;
}

// ── Marking ───────────────────────────────────────────────────────────────

/**
 * Bulk roster save: attendance plus homework and quiz marks for one session,
 * in a single write. This mirrors how a teacher actually works — down the
 * register once — rather than forcing one request per member.
 */
export async function saveSessionRecords(
  db: Database,
  auth: AuthContext,
  sessionId: string,
  input: z.infer<typeof saveSessionRecordsSchema>,
) {
  const session = await requireSession(db, sessionId);
  await enforceCanMark(db, auth, session.cohortId);
  const cohort = await requireCohort(db, session.cohortId);

  const enrollmentIds = input.records.map((r) => r.enrollmentId);
  const valid = await db
    .select({ id: membershipEnrollments.id })
    .from(membershipEnrollments)
    .where(
      and(
        inArray(membershipEnrollments.id, enrollmentIds),
        eq(membershipEnrollments.cohortId, session.cohortId),
      ),
    );
  const validIds = new Set(valid.map((v) => v.id));
  const stray = enrollmentIds.filter((id) => !validIds.has(id));
  if (stray.length > 0) {
    throw new ValidationError('Some enrolments do not belong to this cohort');
  }

  const existing = await db
    .select()
    .from(membershipSessionRecords)
    .where(
      and(
        eq(membershipSessionRecords.sessionId, sessionId),
        inArray(membershipSessionRecords.enrollmentId, enrollmentIds),
      ),
    );
  const priorByEnrollment = new Map(existing.map((e) => [e.enrollmentId, e]));

  const saved = [];
  for (const rec of input.records) {
    const prior = priorByEnrollment.get(rec.enrollmentId);

    // Omitted key = leave alone; explicit null = clear. The pass flag is
    // derived here and stored, so a later change to the cohort's pass mark
    // cannot silently re-grade past work.
    const homeworkScore =
      rec.homeworkScore === undefined ? (prior?.homeworkScore ?? null) : rec.homeworkScore;
    const quizScore =
      rec.quizScore === undefined ? (prior?.quizScore ?? null) : rec.quizScore;

    const [row] = await db
      .insert(membershipSessionRecords)
      .values({
        sessionId,
        enrollmentId: rec.enrollmentId,
        attended: rec.attended ?? prior?.attended ?? false,
        homeworkScore,
        homeworkPassed: homeworkScore === null ? null : homeworkScore >= cohort.homeworkPassMark,
        quizScore,
        quizPassed: quizScore === null ? null : quizScore >= cohort.quizPassMark,
        notes: rec.notes === undefined ? (prior?.notes ?? null) : rec.notes,
        recordedBy: auth.memberId,
        recordedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [membershipSessionRecords.sessionId, membershipSessionRecords.enrollmentId],
        set: {
          attended: rec.attended ?? prior?.attended ?? false,
          homeworkScore,
          homeworkPassed:
            homeworkScore === null ? null : homeworkScore >= cohort.homeworkPassMark,
          quizScore,
          quizPassed: quizScore === null ? null : quizScore >= cohort.quizPassMark,
          notes: rec.notes === undefined ? (prior?.notes ?? null) : rec.notes,
          recordedBy: auth.memberId,
          recordedAt: new Date(),
        },
      })
      .returning();
    if (row) saved.push(row);
  }

  return { saved: saved.length, records: saved };
}

export async function recordFinalTest(
  db: Database,
  auth: AuthContext,
  input: z.infer<typeof recordFinalTestSchema>,
) {
  const enrollment = await requireEnrollment(db, input.enrollmentId);
  await enforceCanMark(db, auth, enrollment.cohortId);
  const cohort = await requireCohort(db, enrollment.cohortId);

  const takenAt = input.takenAt ? new Date(input.takenAt) : new Date();

  const [updated] = await db
    .update(membershipEnrollments)
    .set({
      finalTestScore: input.score,
      finalTestPassed: input.score >= cohort.finalTestPassMark,
      finalTestTakenAt: takenAt,
      updatedAt: sql`NOW()`,
    })
    .where(eq(membershipEnrollments.id, input.enrollmentId))
    .returning();

  return updated;
}

export async function recordInduction(
  db: Database,
  auth: AuthContext,
  cohortId: string,
  input: z.infer<typeof recordInductionSchema>,
) {
  await enforceCanMark(db, auth, cohortId);
  await requireCohort(db, cohortId);

  const updated = await db
    .update(membershipEnrollments)
    .set({
      inductionAttended: input.attended,
      inductionAttendedAt: input.attended
        ? input.attendedAt
          ? new Date(input.attendedAt)
          : new Date()
        : null,
      updatedAt: sql`NOW()`,
    })
    .where(
      and(
        eq(membershipEnrollments.cohortId, cohortId),
        inArray(membershipEnrollments.id, input.enrollmentIds),
      ),
    )
    .returning();

  return { updated: updated.length, enrollments: updated };
}

// ── Readiness + graduation ────────────────────────────────────────────────

async function readinessFor(
  db: Database,
  enrollmentId: string,
): Promise<{ readiness: MembershipGraduationReadiness; records: unknown[] }> {
  const enrollment = await requireEnrollment(db, enrollmentId);
  const cohort = await requireCohort(db, enrollment.cohortId);

  const [{ value: sessionCount } = { value: 0 }] = await db
    .select({ value: count() })
    .from(membershipSessions)
    .where(eq(membershipSessions.cohortId, enrollment.cohortId));

  const records = await db
    .select({
      sessionId: membershipSessionRecords.sessionId,
      enrollmentId: membershipSessionRecords.enrollmentId,
      sessionNumber: membershipSessions.sessionNumber,
      attended: membershipSessionRecords.attended,
      homeworkScore: membershipSessionRecords.homeworkScore,
      homeworkPassed: membershipSessionRecords.homeworkPassed,
      quizScore: membershipSessionRecords.quizScore,
      quizPassed: membershipSessionRecords.quizPassed,
      notes: membershipSessionRecords.notes,
      recordedAt: membershipSessionRecords.recordedAt,
    })
    .from(membershipSessionRecords)
    .innerJoin(
      membershipSessions,
      eq(membershipSessionRecords.sessionId, membershipSessions.id),
    )
    .where(eq(membershipSessionRecords.enrollmentId, enrollmentId))
    .orderBy(asc(membershipSessions.sessionNumber));

  const readiness = evaluateGraduationReadiness({
    sessionCount,
    records: records.map((r) => ({
      sessionNumber: r.sessionNumber as MembershipSessionNumber,
      attended: r.attended,
      homeworkPassed: r.homeworkPassed,
      quizPassed: r.quizPassed,
    })),
    finalTestPassed: enrollment.finalTestPassed,
    finalTestTakenAt: enrollment.finalTestTakenAt?.toISOString() ?? null,
    finalTestDeadline: cohort.finalTestDeadline,
    inductionAttended: enrollment.inductionAttended,
  });

  return { readiness, records };
}

export async function getEnrollmentDetail(
  db: Database,
  auth: AuthContext,
  enrollmentId: string,
) {
  const enrollment = await requireEnrollment(db, enrollmentId);

  // A member may always see their own progress. Everyone else needs to be an
  // admin, a teacher on the cohort, or a leader over that member's branch.
  if (enrollment.memberId !== auth.memberId) {
    const teaches =
      auth.systemRole === 'admin' ||
      (await isCohortTeacher(db, enrollment.cohortId, auth.memberId));
    if (!teaches) {
      const sameBranch = !!enrollment.branchId && enrollment.branchId === auth.branchId;
      if (!sameBranch || !authHasCapability(auth, 'branch:write')) {
        throw new ForbiddenError('You do not have access to this enrolment');
      }
    }
  }

  const [row] = await db
    .select({
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      memberEmail: members.email,
      branchName: branches.branchName,
      cohortName: membershipCohorts.name,
    })
    .from(membershipEnrollments)
    .innerJoin(members, eq(membershipEnrollments.memberId, members.id))
    .innerJoin(membershipCohorts, eq(membershipEnrollments.cohortId, membershipCohorts.id))
    .leftJoin(branches, eq(membershipEnrollments.branchId, branches.id))
    .where(eq(membershipEnrollments.id, enrollmentId))
    .limit(1);

  const { readiness, records } = await readinessFor(db, enrollmentId);

  return { ...enrollment, ...row, records, readiness };
}

/**
 * Graduating is what actually makes someone a Member. It stamps
 * `members.membership_class_completed_at` through the existing
 * `setMembershipClassCompleted`, which also promotes `member_type` and fires
 * the member-confirmed notification — reusing it keeps one code path for
 * certification rather than two that can drift.
 *
 * The gate is enforced per enrolment. `override` skips it but demands a
 * reason, which is written onto the enrolment notes for the audit trail.
 */
export async function graduateMembers(
  db: Database,
  auth: AuthContext,
  cohortId: string,
  input: z.infer<typeof graduateSchema>,
) {
  enforceCohortAdmin(auth);
  const cohort = await requireCohort(db, cohortId);

  const completedAt = input.completedAt
    ? new Date(input.completedAt)
    : cohort.graduationDate
      ? new Date(cohort.graduationDate)
      : new Date();

  const graduated: string[] = [];
  const blocked: { enrollmentId: string; outstanding: string[] }[] = [];

  for (const enrollmentId of input.enrollmentIds) {
    const enrollment = await requireEnrollment(db, enrollmentId);
    if (enrollment.cohortId !== cohortId) {
      throw new ValidationError('An enrolment does not belong to this cohort');
    }
    if (enrollment.status === 'graduated') continue;

    if (!input.override) {
      const { readiness } = await readinessFor(db, enrollmentId);
      if (!readiness.eligible) {
        blocked.push({ enrollmentId, outstanding: readiness.outstanding });
        continue;
      }
    }

    await db
      .update(membershipEnrollments)
      .set({
        status: 'graduated',
        graduatedAt: completedAt,
        notes: input.override
          ? appendNote(enrollment.notes, `Graduated by override: ${input.overrideReason}`)
          : enrollment.notes,
        updatedAt: sql`NOW()`,
      })
      .where(eq(membershipEnrollments.id, enrollmentId));

    // The single certification path, shared with the manual admin override.
    await setMembershipClassCompleted(db, enrollment.memberId, completedAt, auth);
    graduated.push(enrollmentId);
  }

  return { graduated: graduated.length, graduatedIds: graduated, blocked };
}

/** A member's own view of where they are. Never gated. */
export async function getMyMembership(db: Database, auth: AuthContext) {
  const [enrollment] = await db
    .select()
    .from(membershipEnrollments)
    .where(eq(membershipEnrollments.memberId, auth.memberId))
    .orderBy(desc(membershipEnrollments.enrolledAt))
    .limit(1);

  const [member] = await db
    .select({ completedAt: members.membershipClassCompletedAt })
    .from(members)
    .where(eq(members.id, auth.memberId))
    .limit(1);

  if (!enrollment) {
    return { enrollment: null, readiness: null, confirmedAt: member?.completedAt ?? null };
  }

  const detail = await getEnrollmentDetail(db, auth, enrollment.id);
  return {
    enrollment: detail,
    readiness: detail.readiness,
    confirmedAt: member?.completedAt ?? null,
  };
}

// ── Small helpers ─────────────────────────────────────────────────────────

async function requireCohort(db: Database, cohortId: string) {
  const [cohort] = await db
    .select()
    .from(membershipCohorts)
    .where(eq(membershipCohorts.id, cohortId))
    .limit(1);
  if (!cohort) throw new NotFoundError('Cohort not found');
  return cohort;
}

async function requireSession(db: Database, sessionId: string) {
  const [session] = await db
    .select()
    .from(membershipSessions)
    .where(eq(membershipSessions.id, sessionId))
    .limit(1);
  if (!session) throw new NotFoundError('Session not found');
  return session;
}

async function requireEnrollment(db: Database, enrollmentId: string) {
  const [enrollment] = await db
    .select()
    .from(membershipEnrollments)
    .where(eq(membershipEnrollments.id, enrollmentId))
    .limit(1);
  if (!enrollment) throw new NotFoundError('Enrolment not found');
  return enrollment;
}

/**
 * Cohort names are how people refer to a run, so a duplicate is a real
 * conflict. The DB has a partial unique index on LOWER(name); this check turns
 * that into a clean 409 instead of a driver error.
 */
async function assertNameFree(db: Database, name: string, exceptId: string | null) {
  const conditions = [
    sql`LOWER(${membershipCohorts.name}) = LOWER(${name.trim()})`,
    eq(membershipCohorts.isActive, true),
  ];
  if (exceptId) conditions.push(sql`${membershipCohorts.id} <> ${exceptId}`);
  const [clash] = await db
    .select({ id: membershipCohorts.id })
    .from(membershipCohorts)
    .where(and(...conditions))
    .limit(1);
  if (clash) throw new ConflictError(`A cohort named "${name.trim()}" already exists`);
}

function appendNote(existing: string | null, addition: string): string {
  return existing ? `${existing}\n${addition}` : addition;
}

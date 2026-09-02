import { z } from 'zod';

const cohortStatuses = ['planned', 'active', 'completed', 'cancelled'] as const;
const teacherRoles = ['lead', 'teacher'] as const;
const withdrawnReasons = [
  'stopped_attending',
  'withdrew',
  'moved_away',
  'deferred_to_next',
  'other',
] as const;

/** Marks are percentages. */
const mark = z.number().int().min(0).max(100);

/** A calendar date, not a timestamp — deadlines and ceremony dates are days. */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date');

export const createCohortSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  startDate: isoDate,
  graduationDate: isoDate.optional(),
  finalTestDeadline: isoDate.optional(),
  status: z.enum(cohortStatuses).optional(),
  enrolmentOpen: z.boolean().optional(),
  homeworkPassMark: mark.optional(),
  quizPassMark: mark.optional(),
  finalTestPassMark: mark.optional(),
  notes: z.string().max(2000).optional(),
});

export const updateCohortSchema = createCohortSchema.partial();

export const listCohortsQuerySchema = z.object({
  status: z.enum(cohortStatuses).optional(),
  /** Only cohorts currently accepting self-enrolment. */
  enrolmentOpen: z.coerce.boolean().optional(),
  includeInactive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const upsertSessionSchema = z.object({
  sessionNumber: z.number().int().min(1).max(4),
  title: z.string().min(2).max(200),
  sessionDate: z.string().datetime().nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  teacherId: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const assignTeacherSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(teacherRoles).optional(),
});

export const enrolMembersSchema = z.object({
  memberIds: z.array(z.string().uuid()).min(1).max(200),
});

/**
 * A roster row. `attended` is optional so a teacher can save marks without
 * touching attendance and vice versa.
 *
 * Scores are mandatory when an assessment is recorded: pass a number to record
 * it, `null` to clear it, or omit the key to leave the existing value alone.
 * The service derives the pass flag from the cohort's pass mark.
 */
export const recordInputSchema = z.object({
  enrollmentId: z.string().uuid(),
  attended: z.boolean().optional(),
  homeworkScore: mark.nullable().optional(),
  quizScore: mark.nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const saveSessionRecordsSchema = z.object({
  records: z.array(recordInputSchema).min(1).max(200),
});

export const recordFinalTestSchema = z.object({
  enrollmentId: z.string().uuid(),
  score: mark,
  takenAt: z.string().datetime().optional(),
});

export const recordInductionSchema = z.object({
  enrollmentIds: z.array(z.string().uuid()).min(1).max(200),
  attended: z.boolean(),
  attendedAt: z.string().datetime().optional(),
});

export const graduateSchema = z
  .object({
    enrollmentIds: z.array(z.string().uuid()).min(1).max(200),
    override: z.boolean().optional(),
    overrideReason: z.string().max(500).optional(),
    completedAt: isoDate.optional(),
  })
  // An override without a stated reason leaves no audit trail for why someone
  // graduated without meeting the gate.
  .refine((v) => !v.override || !!v.overrideReason?.trim(), {
    message: 'overrideReason is required when override is true',
    path: ['overrideReason'],
  });

export const withdrawEnrollmentSchema = z.object({
  reason: z.enum(withdrawnReasons),
  notes: z.string().max(1000).optional(),
});

export const listEnrollmentsQuerySchema = z.object({
  status: z.enum(['enrolled', 'graduated', 'withdrawn', 'deferred']).optional(),
  branchId: z.string().uuid().optional(),
  search: z.string().max(120).optional(),
});

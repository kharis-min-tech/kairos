import { z } from 'zod';

const stages = [
  'enrolled',
  'session-1',
  'session-2',
  'session-3',
  'session-4',
  'completed',
  'integrated',
] as const;

export const createEnrollmentSchema = z.object({
  memberId: z.string().uuid(),
  branchId: z.string().uuid(),
  teacherId: z.string().uuid().optional(),
  mentorId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
});

export const updateEnrollmentSchema = z.object({
  stage: z.enum(stages).optional(),
  teacherId: z.string().uuid().nullable().optional(),
  mentorId: z.string().uuid().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
  /** Merged into existing sessionCompletedAt map */
  sessionCompletedAt: z.record(z.string(), z.string()).nullable().optional(),
  /** Merged into existing sessionFeedback map */
  sessionFeedback: z.record(z.string(), z.string()).nullable().optional(),
  /** Branch department joined at the integrated stage */
  joinedDepartmentId: z.string().uuid().nullable().optional(),
});

export const listEnrollmentsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  stage: z.enum(stages).optional(),
  teacherId: z.string().uuid().optional(),
  stale: z.coerce.boolean().optional(), // only enrollments with no update in N days
  sortBy: z.enum(['date-added', 'name', 'last-activity']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
});

export const bulkAdvanceSchema = z.object({
  enrollmentIds: z.array(z.string().uuid()).min(1).max(50),
  targetStage: z.enum(stages),
});

export const createSessionSchema = z.object({
  branchId: z.string().uuid(),
  sessionDate: z.string().min(1),
  topic: z.string().min(1).max(200),
  teacherId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
  feedback: z.string().max(2000).optional(),
});

export const updateSessionSchema = createSessionSchema.partial();

export const recordAttendanceSchema = z.object({
  records: z.array(
    z.object({
      enrollmentId: z.string().uuid(),
      attended: z.boolean(),
      notes: z.string().max(500).optional(),
    })
  ).min(1),
});

export const listSessionsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  upcoming: z.coerce.boolean().optional(),
});

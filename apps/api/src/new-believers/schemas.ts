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
  notes: z.string().max(1000).optional(),
});

export const updateEnrollmentSchema = z.object({
  stage: z.enum(stages).optional(),
  teacherId: z.string().uuid().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const listEnrollmentsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  stage: z.enum(stages).optional(),
  teacherId: z.string().uuid().optional(),
  stale: z.coerce.boolean().optional(), // only enrollments with no update in N days
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const createSessionSchema = z.object({
  branchId: z.string().uuid(),
  sessionDate: z.string().min(1),
  topic: z.string().min(1).max(200),
  teacherId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
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

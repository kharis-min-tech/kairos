import { z } from 'zod';

const serviceTypeEnum = z.enum(['Sunday', 'Midweek', 'Special']);
const attendanceStatusEnum = z.enum(['Present', 'Late', 'Virtual']);

// ── Service CRUD ───────────────────────────────────────────

export const createServiceSchema = z
  .object({
    branchId: z.string().uuid().optional(),
    serviceDate: z.string().datetime({ message: 'serviceDate must be an ISO datetime' }),
    serviceType: serviceTypeEnum,
    serviceTitle: z.string().max(200).optional(),
    topic: z.string().max(200).optional(),
    preacherId: z.string().uuid().optional(),
    expectedAttendance: z.coerce.number().int().nonnegative().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.serviceType === 'Special' && (!data.serviceTitle || data.serviceTitle.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['serviceTitle'],
        message: 'A title is required for special services',
      });
    }
  });

export const updateServiceSchema = z
  .object({
    branchId: z.string().uuid().optional(),
    serviceDate: z.string().datetime().optional(),
    serviceType: serviceTypeEnum.optional(),
    serviceTitle: z.string().max(200).nullable().optional(),
    topic: z.string().max(200).nullable().optional(),
    preacherId: z.string().uuid().nullable().optional(),
    expectedAttendance: z.coerce.number().int().nonnegative().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.serviceType === 'Special' &&
      (data.serviceTitle === undefined || data.serviceTitle === null || data.serviceTitle.trim().length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['serviceTitle'],
        message: 'A title is required for special services',
      });
    }
  });

export const listServicesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  branchId: z.string().uuid().optional(),
  type: serviceTypeEnum.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

// ── Roster ─────────────────────────────────────────────────

export const rosterQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(100),
  search: z.string().max(150).optional(),
});

// ── Record attendance (bulk upsert) ────────────────────────

const existingEntrySchema = z.object({
  memberId: z.string().uuid(),
  status: attendanceStatusEnum,
  arrivalTime: z.string().datetime().optional(),
});

const visitorEntrySchema = z.object({
  visitor: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    phone: z.string().max(20).optional(),
  }),
  status: attendanceStatusEnum,
  arrivalTime: z.string().datetime().optional(),
});

const attendanceEntrySchema = z.union([existingEntrySchema, visitorEntrySchema]).refine(
  (entry) => 'memberId' in entry || 'visitor' in entry,
  { message: 'Each entry must include either memberId or visitor' },
);

export const recordAttendanceSchema = z.object({
  entries: z.array(attendanceEntrySchema).min(1, 'At least one entry is required'),
});

// ── Reports ────────────────────────────────────────────────

export const trendsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  weeks: z.coerce.number().int().positive().max(52).default(4),
});

export const missingMembersQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  services: z.coerce.number().int().positive().max(52).default(4),
});

export const byBranchQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  weeks: z.coerce.number().int().positive().max(52).default(4),
});

export const summaryQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  weeks: z.coerce.number().int().positive().max(52).default(4),
});

// Cohort comparison — set-difference between any two service selections.
// Returns members present in "A" (per `presentMode`) and absent from "B" (per `absentMode`).
// Single-select inputs collapse: ANY and ALL produce the same answer.
export const cohortDiffSchema = z
  .object({
    presentInServiceIds: z.array(z.string().uuid()).max(50).default([]),
    absentFromServiceIds: z.array(z.string().uuid()).max(50).default([]),
    presentMode: z.enum(['any', 'all']).default('any'),
    absentMode: z.enum(['any', 'all']).default('any'),
    branchId: z.string().uuid().optional(),
  })
  .refine(
    (data) =>
      data.presentInServiceIds.length > 0 || data.absentFromServiceIds.length > 0,
    { message: 'At least one of presentInServiceIds or absentFromServiceIds is required' },
  );

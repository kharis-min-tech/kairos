import { z } from 'zod';

const serviceTypes = [
  'Sunday Service',
  'Midweek Service',
  'Special Service',
  'Prayer Meeting',
  'Other',
] as const;

const attendanceStatuses = ['Present', 'Absent', 'Virtual', 'Late'] as const;

export const createServiceSchema = z.object({
  branchId: z.string().uuid(),
  serviceDate: z.string().min(1),
  serviceType: z.enum(serviceTypes),
  serviceTitle: z.string().max(200).optional(),
  preacherId: z.string().uuid().optional(),
  topic: z.string().max(200).optional(),
  expectedAttendance: z.coerce.number().int().nonnegative().optional(),
});

export const updateServiceSchema = createServiceSchema.partial().omit({ branchId: true });

export const recordAttendanceSchema = z.object({
  records: z.array(
    z.object({
      memberId: z.string().uuid(),
      attendanceStatus: z.enum(attendanceStatuses),
      arrivalTime: z.string().optional(),
      isFirstTimeVisitor: z.boolean().default(false),
      visitorName: z.string().max(200).optional(),
      visitorPhone: z.string().max(20).optional(),
      visitorEmail: z.string().email().max(100).optional(),
    }),
  ).min(1),
});

export const listServicesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  branchId: z.string().uuid().optional(),
  serviceType: z.enum(serviceTypes).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const attendanceTrendsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  weeks: z.coerce.number().int().positive().max(52).default(4),
});

export const attendanceByBranchQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const importAttendanceSchema = z.object({
  serviceId: z.string().uuid(),
  records: z.array(
    z.object({
      memberEmail: z.string().email().optional(),
      memberPhone: z.string().optional(),
      attendanceStatus: z.enum(attendanceStatuses),
      isFirstTimeVisitor: z.boolean().default(false),
    }),
  ).min(1),
});

export const selfCheckInSchema = z.object({
  attendanceStatus: z.enum(['Present', 'Virtual', 'Late']).default('Present'),
  arrivalTime: z.string().optional(),
});

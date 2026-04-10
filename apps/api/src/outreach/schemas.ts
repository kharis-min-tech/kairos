import { z } from 'zod';

// ── Outreach Programs ─────────────────────────────────────

export const createProgramSchema = z.object({
  programName: z.string().min(1).max(200),
  programDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location: z.string().min(1).max(300),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  description: z.string().optional(),
  coordinatorId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const listProgramsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isCompleted: z.coerce.boolean().optional(),
});

export const completeProgramSchema = z.object({
  totalSoulsReached: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

// ── Souls ─────────────────────────────────────────────────

export const captureSoulSchema = z.object({
  outreachId: z.string().uuid().optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(100).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  gender: z.enum(['Male', 'Female']).optional(),
  ageRange: z.string().max(20).optional(),
  assignedMemberId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const listSoulsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  outreachId: z.string().uuid().optional(),
  status: z
    .enum(['New', 'Following Up', 'Interested', 'Not Interested', 'Converted', 'Lost Contact'])
    .optional(),
  assignedToMe: z.coerce.boolean().optional(),
});

const VALID_SOUL_STATUSES = [
  'New',
  'Following Up',
  'Interested',
  'Not Interested',
  'Converted',
  'Lost Contact',
] as const;

export const updateSoulStatusSchema = z
  .object({
    status: z.enum(VALID_SOUL_STATUSES),
    convertedToMemberId: z.string().uuid().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => data.status !== 'Converted' || !!data.convertedToMemberId,
    { message: 'convertedToMemberId is required when status is Converted', path: ['convertedToMemberId'] }
  );

export const reassignSoulSchema = z.object({
  assignedMemberId: z.string().uuid(),
});

// ── Follow-ups ────────────────────────────────────────────

export const logFollowUpSchema = z.object({
  contactMethod: z
    .enum(['Phone Call', 'Text Message', 'Email', 'WhatsApp', 'In-Person Visit', 'Other'])
    .optional(),
  contactStatus: z.enum([
    'Successful',
    'No Answer',
    'Wrong Number',
    'Call Back Later',
    'Not Interested',
    'Interested',
  ]),
  durationMinutes: z.number().int().min(1).optional(),
  notes: z.string().optional(),
  nextFollowUpDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const listAlertsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  daysSinceLastContact: z.coerce.number().int().min(1).default(7),
});

// ── Outreach participants ─────────────────────────────────

export const registerWorkerSchema = z.object({
  role: z.string().max(50).optional(),
  notes: z.string().optional(),
});

// ── Types ─────────────────────────────────────────────────

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type ListProgramsQuery = z.infer<typeof listProgramsQuerySchema>;
export type CompleteProgramInput = z.infer<typeof completeProgramSchema>;
export type CaptureSoulInput = z.infer<typeof captureSoulSchema>;
export type ListSoulsQuery = z.infer<typeof listSoulsQuerySchema>;
export type UpdateSoulStatusInput = z.infer<typeof updateSoulStatusSchema>;
export type ReassignSoulInput = z.infer<typeof reassignSoulSchema>;
export type LogFollowUpInput = z.infer<typeof logFollowUpSchema>;
export type ListAlertsQuery = z.infer<typeof listAlertsQuerySchema>;
export type RegisterWorkerInput = z.infer<typeof registerWorkerSchema>;

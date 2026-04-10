import { z } from 'zod';

// ── Form Definitions ──────────────────────────────────────

export const createFormSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  formType: z.string().max(50).optional(),
  fields: z.record(z.unknown()).optional(),
  targetBranchId: z.string().uuid().optional(),
});

export const listFormsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  formType: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

// ── Form Submissions ──────────────────────────────────────

export const submitFormSchema = z.object({
  data: z.record(z.unknown()),
  notes: z.string().optional(),
});

export const listSubmissionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  formId: z.string().uuid().optional(),
  formType: z.string().optional(),
});

// ── Prebuilt Forms ────────────────────────────────────────

const PREBUILT_FORM_TYPES = [
  'altar-call',
  'first-timer',
  'department-signup',
  'soul-capture',
  'baby-dedication',
  'testimony',
] as const;

export const handlePrebuiltSchema = z.object({
  formType: z.enum(PREBUILT_FORM_TYPES),
  data: z.record(z.unknown()),
  notes: z.string().optional(),
});

// ── Types ─────────────────────────────────────────────────

export type CreateFormInput = z.infer<typeof createFormSchema>;
export type ListFormsQuery = z.infer<typeof listFormsQuerySchema>;
export type SubmitFormInput = z.infer<typeof submitFormSchema>;
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;
export type HandlePrebuiltInput = z.infer<typeof handlePrebuiltSchema>;

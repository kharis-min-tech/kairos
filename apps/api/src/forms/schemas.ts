import { z } from 'zod';

// ── Form type enum (matches @kairos/types FormType) ────────
export const formTypes = [
  'altar_call',
  'baptism',
  'testimony',
  'baby_naming',
  'baby_dedication',
] as const;

export const formSubmissionStatuses = [
  'new',
  'reviewed',
  'converted',
  'dismissed',
] as const;

const testimonyCategories = [
  'Business',
  'Career/Job',
  'Deliverance',
  'Education',
  'Financial',
  'Health/Healing',
  'Marriage/Family',
  'Salvation',
  'Unusual Favour',
  'Other',
] as const;

const genderEnum = z.enum(['Male', 'Female']);

// ── Per-form payload schemas (match @kairos/types payload interfaces) ──

export const altarCallPayloadSchema = z.object({
  todaysDate: z.string().min(1),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().min(1).max(20),
});

export const baptismPayloadSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().min(1).max(20),
});

export const testimonyPayloadSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().min(1).max(20),
  todaysDate: z.string().min(1),
  dateOfTestimony: z.string().min(1),
  category: z.enum(testimonyCategories),
  details: z.string().min(1),
  shareAnonymously: z.boolean(),
  happyToShareSunday: z.boolean(),
  acknowledged: z.literal(true, {
    errorMap: () => ({ message: 'You must acknowledge before submitting' }),
  }),
});

export const babyNamingPayloadSchema = z.object({
  babyFullName: z.string().min(1).max(200),
  dateOfBirth: z.string().min(1),
  gender: genderEnum.optional(),
  fathersName: z.string().min(1).max(200),
  mothersName: z.string().min(1).max(200),
  parentContactPhone: z.string().min(1).max(20),
  parentContactEmail: z.string().email().optional(),
  preferredCeremonyDate: z.string().optional(),
  additionalNotes: z.string().max(2000).optional(),
});

export const babyDedicationPayloadSchema = z.object({
  babyFullName: z.string().min(1).max(200),
  dateOfBirth: z.string().min(1),
  gender: genderEnum.optional(),
  fathersName: z.string().min(1).max(200),
  mothersName: z.string().min(1).max(200),
  parentContactPhone: z.string().min(1).max(20),
  parentsAreMembers: z.boolean().optional(),
  parentContactEmail: z.string().email().optional(),
  preferredDedicationDate: z.string().optional(),
  additionalNotes: z.string().max(2000).optional(),
});

/** Map of formType → payload schema. Used to validate the submit body
 *  against the route's :formType param (discriminated by the route). */
export const payloadSchemaByFormType = {
  altar_call: altarCallPayloadSchema,
  baptism: baptismPayloadSchema,
  testimony: testimonyPayloadSchema,
  baby_naming: babyNamingPayloadSchema,
  baby_dedication: babyDedicationPayloadSchema,
} as const;

/** Build the body validator for POST /:formType/submit.
 *  payload is validated by the service against the route's formType (404 if
 *  formType is unknown); here we only enforce the envelope shape. */
export const submitFormSchema = z.object({
  subjectMemberId: z.string().uuid().optional(),
  // branchId may be present on the wire but is ignored — auth.branchId is forced.
  branchId: z.string().uuid().optional(),
  payload: z.record(z.string(), z.unknown()),
});

// ── Member typeahead search ────────────────────────────────
export const memberSearchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  branchId: z.string().uuid().optional(),
});

// ── Submissions list / detail / update ─────────────────────
export const listSubmissionsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  formType: z.enum(formTypes).optional(),
  status: z.enum(formSubmissionStatuses).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const updateSubmissionSchema = z
  .object({
    status: z.enum(formSubmissionStatuses).optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .refine((v) => v.status !== undefined || v.notes !== undefined, {
    message: 'At least one of status or notes is required',
  });

// ── CSV export (formType required so columns are well-defined) ──
export const exportSubmissionsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  formType: z.enum(formTypes),
  status: z.enum(formSubmissionStatuses).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

// ── Dormant prospect archive ───────────────────────────────
export const archiveProspectsSchema = z.object({
  memberIds: z.array(z.string().uuid()).min(1).max(500),
});

export type SubmitFormInput = z.infer<typeof submitFormSchema>;
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;
export type UpdateSubmissionInput = z.infer<typeof updateSubmissionSchema>;
export type ExportSubmissionsQuery = z.infer<typeof exportSubmissionsQuerySchema>;
export type MemberSearchQuery = z.infer<typeof memberSearchQuerySchema>;
export type ArchiveProspectsInput = z.infer<typeof archiveProspectsSchema>;

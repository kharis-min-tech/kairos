import { z } from 'zod';
import { evaluateCondition } from '@kairos/types';

// ── Form type enum (matches @kairos/types FormType) ────────
export const formTypes = [
  'altar_call',
  'baptism',
  'testimony',
  'baby_naming',
  'baby_dedication',
  'first_time_visitor',
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

// ── First-time visitor (branching-aware) ───────────────────
//
// Field ids mirror FIRST_TIME_VISITOR_FORM exactly (the web renderer emits a
// payload keyed by those ids). The under-16 / guardian / children branching is
// enforced in superRefine, reusing `evaluateCondition` so the server applies the
// SAME rule the form definition's `visibleWhen` uses (isUnder16 === 'Yes' OR
// dateOfBirth implies age < 16). Interest/source fields stay optional.

const firstTimeVisitorChildSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().min(1),
  gender: genderEnum.optional(),
});

export type FirstTimeVisitorChild = z.infer<typeof firstTimeVisitorChildSchema>;

/** True when the visitor is under 16 per the form-engine rule (self-report OR DOB-derived). */
export function isVisitorUnder16(values: Record<string, unknown>): boolean {
  return evaluateCondition(
    {
      op: 'or',
      conditions: [
        { field: 'isUnder16', op: 'equals', value: 'Yes' },
        { field: 'dateOfBirth', op: 'ageUnder', value: 16 },
      ],
    },
    values,
  );
}

export const firstTimeVisitorPayloadSchema = z
  .object({
    // About you
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    middleName: z.string().max(100).optional(),
    dateOfBirth: z.string().min(1),
    gender: genderEnum.optional(),
    isUnder16: z.enum(['Yes', 'No']).optional(),
    // Contact (conditionally required — see superRefine)
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
    address: z.string().max(300).optional(),
    city: z.string().max(100).optional(),
    postalCode: z.string().max(20).optional(),
    // Guardian (required when under 16 — see superRefine)
    guardianName: z.string().max(200).optional(),
    guardianPhone: z.string().max(20).optional(),
    guardianRelationship: z.string().max(100).optional(),
    // Children
    broughtChildren: z.boolean().optional(),
    children: z.array(firstTimeVisitorChildSchema).max(12).optional(),
    // Getting involved (all optional)
    interest: z
      .enum(['fellowship', 'department', 'new_believers', 'just_visiting'])
      .optional(),
    howDidYouHear: z.string().max(500).optional(),
    invitedBy: z.string().max(200).optional(),
  })
  .superRefine((v, ctx) => {
    const under16 = isVisitorUnder16(v as Record<string, unknown>);

    if (under16) {
      // Guardian carries the contact burden; contact fields relaxed.
      if (!v.guardianName || v.guardianName.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['guardianName'],
          message: 'Guardian name is required for visitors under 16',
        });
      }
      if (!v.guardianPhone || v.guardianPhone.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['guardianPhone'],
          message: 'Guardian phone is required for visitors under 16',
        });
      }
      if (!v.guardianRelationship || v.guardianRelationship.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['guardianRelationship'],
          message: 'Guardian relationship is required for visitors under 16',
        });
      }
    } else {
      // 16+: the visitor owns their contact details.
      if (!v.email || v.email.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['email'],
          message: 'Email is required',
        });
      }
      if (!v.phone || v.phone.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['phone'],
          message: 'Phone is required',
        });
      }
    }

    if (v.broughtChildren === true && (!v.children || v.children.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['children'],
        message: 'At least one child is required when you came with children',
      });
    }
  });

export type FirstTimeVisitorPayload = z.infer<typeof firstTimeVisitorPayloadSchema>;
export type BaptismPayload = z.infer<typeof baptismPayloadSchema>;
export type TestimonyPayload = z.infer<typeof testimonyPayloadSchema>;
export type BabyNamingPayload = z.infer<typeof babyNamingPayloadSchema>;
export type BabyDedicationPayload = z.infer<typeof babyDedicationPayloadSchema>;
/** Baby naming and dedication share the fields the service touches (babyFullName,
 *  dateOfBirth, gender, parentContactPhone); dedication adds parentsAreMembers. */
export type BabyPayload = BabyNamingPayload | BabyDedicationPayload;

/** Map of formType → payload schema. Used to validate the submit body
 *  against the route's :formType param (discriminated by the route). */
export const payloadSchemaByFormType = {
  altar_call: altarCallPayloadSchema,
  baptism: baptismPayloadSchema,
  testimony: testimonyPayloadSchema,
  baby_naming: babyNamingPayloadSchema,
  baby_dedication: babyDedicationPayloadSchema,
  first_time_visitor: firstTimeVisitorPayloadSchema,
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

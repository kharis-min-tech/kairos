import { z } from 'zod';

export const createBranchDepartmentSchema = z.object({
  branchId: z.string().uuid(),
  departmentId: z.string().uuid(),
  leadMemberId: z.string().uuid(),
  deputyMemberId: z.string().uuid().optional(),
  description: z.string().max(2000).optional(),
  startDate: z.string().optional(),
});

export const updateBranchDepartmentSchema = z.object({
  leadMemberId: z.string().uuid().optional(),
  deputyMemberId: z.string().uuid().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  endDate: z.string().nullable().optional(),
});

export const listBranchDepartmentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  branchId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  memberId: z.string().uuid().optional(),
});

export const addDepartmentMemberSchema = z.object({
  memberId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
});

export const createJoinRequestSchema = z.object({
  notes: z.string().max(500).optional(),
});

export const listJoinRequestsQuerySchema = z.object({
  stage: z.enum(['open', 'all', 'terminal']).optional(),
});

export const scheduleInterviewSchema = z.object({
  interviewScheduledAt: z.string().datetime(),
  interviewFormat: z.enum(['in_person', 'virtual']),
  interviewLocation: z.string().max(500).optional(),
  interviewerOneId: z.string().uuid(),
  interviewerTwoId: z.string().uuid().optional(),
});

export const recordInterviewSchema = z.object({
  interviewOutcome: z.enum(['pass', 'fail']),
  interviewNotes: z.string().max(2000).optional(),
});

export const extendOfferSchema = z.object({
  offerExpiresAt: z.string().datetime().optional(),
  offerMessage: z.string().max(2000).optional(),
  probationDays: z.coerce.number().int().min(1).max(365).optional(),
});

export const respondToOfferSchema = z.object({
  offerResponse: z.enum(['accepted', 'declined']),
});

export const rejectJoinRequestSchema = z.object({
  reviewNotes: z.string().max(2000).optional(),
});

export const evaluateProbationSchema = z.object({
  probationOutcome: z.enum(['passed', 'failed']),
  probationNotes: z.string().max(2000).optional(),
});

export const createGlobalDepartmentSchema = z.object({
  departmentName: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  iconKey: z.string().max(50).optional(),
});

export const updateGlobalDepartmentSchema = createGlobalDepartmentSchema.partial();

// ── Followups ──────────────────────────────────────────────

const contactMethodEnum = z.enum([
  'Phone Call',
  'Text Message',
  'Email',
  'WhatsApp',
  'In-Person Visit',
  'Other',
]);

const contactStatusEnum = z.enum([
  'Successful',
  'No Answer',
  'Wrong Number',
  'Call Back Later',
  'Not Interested',
  'Interested',
]);

export const createDepartmentFollowupSchema = z.object({
  contactMethod: contactMethodEnum,
  contactStatus: contactStatusEnum,
  contactedAt: z.string().datetime().optional(),
  durationMinutes: z.coerce.number().int().positive().optional(),
  notes: z.string().max(2000).optional(),
  nextFollowUpDate: z.string().optional(),
  assignedToId: z.string().uuid().optional(),
});

export const updateDepartmentFollowupSchema = z.object({
  contactMethod: contactMethodEnum.optional(),
  contactStatus: contactStatusEnum.optional(),
  contactedAt: z.string().datetime().optional(),
  durationMinutes: z.coerce.number().int().positive().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  nextFollowUpDate: z.string().nullable().optional(),
  assignedToId: z.string().uuid().nullable().optional(),
});

export const listDepartmentFollowupsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
  days: z.coerce.number().int().positive().max(365).optional(),
  memberId: z.string().uuid().optional(),
});

export const overdueFollowupsQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).default(7),
});

// ── Uniform ────────────────────────────────────────────────

const genderTargetEnum = z.enum(['Male', 'Female', 'Unisex']);

// Allow up to ~600KB string. Client compresses uploads to ≤500KB data URI;
// keep some slack for the data: prefix and to avoid false negatives.
const imageRefSchema = z.string().max(600000).refine(
  (v) => /^https?:\/\//.test(v) || /^data:image\/(jpeg|png|webp|gif);base64,/.test(v),
  { message: 'imageUrl must be an http/https URL or a base64 JPEG/PNG/WebP/GIF data URI' },
);

export const createOutfitSchema = z.object({
  name: z.string().min(1).max(150),
  imageUrl: imageRefSchema,
  genderTarget: genderTargetEnum.optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateOutfitSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  imageUrl: imageRefSchema.optional(),
  genderTarget: genderTargetEnum.optional(),
  notes: z.string().max(2000).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const listOutfitsQuerySchema = z.object({
  includeInactive: z.coerce.boolean().optional(),
});

export const assignScheduleSchema = z.object({
  outfitId: z.string().uuid(),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'serviceDate must be ISO YYYY-MM-DD'),
  genderTarget: genderTargetEnum.optional(),
  notes: z.string().max(2000).optional(),
});

export const listScheduleQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ── Rota schemas ───────────────────────────────────────────

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createRotaTemplateSchema = z.object({
  name: z.string().min(1).max(150),
  weekday: z.number().int().min(0).max(6),
  defaultStartTime: z.string().regex(timeRegex, 'defaultStartTime must be HH:MM').nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateRotaTemplateSchema = createRotaTemplateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createRotaSlotSchema = z.object({
  roleName: z.string().min(1).max(100),
  positionsRequired: z.number().int().positive().optional(),
  notes: z.string().max(2000).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateRotaSlotSchema = createRotaSlotSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const addPoolMemberSchema = z.object({
  memberId: z.string().uuid(),
  preferredRoleName: z.string().max(100).nullable().optional(),
  weight: z.number().int().positive().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const generateRotaSchema = z.object({
  weeks: z.number().int().min(1).max(52),
  startDate: z.string().regex(isoDateRegex, 'startDate must be ISO YYYY-MM-DD'),
});

export const updateInstanceStatusSchema = z.object({
  status: z.enum(['Draft', 'Published', 'Cancelled']),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateAssignmentSchema = z.object({
  memberId: z.string().uuid().nullable().optional(),
  status: z.enum(['Assigned', 'Confirmed', 'Declined', 'Swapped', 'Open']).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const createSwapRequestSchema = z.object({
  proposedMemberId: z.string().uuid().nullable().optional(),
  reason: z.string().max(2000).nullable().optional(),
});

export const reviewSwapRequestSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  reviewNotes: z.string().max(2000).nullable().optional(),
});

export const listInstancesQuerySchema = z.object({
  from: z.string().regex(isoDateRegex).optional(),
  to: z.string().regex(isoDateRegex).optional(),
});

export const listSwapRequestsQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
});

export const listMyRotaQuerySchema = z.object({
  from: z.string().regex(isoDateRegex).optional(),
  to: z.string().regex(isoDateRegex).optional(),
});

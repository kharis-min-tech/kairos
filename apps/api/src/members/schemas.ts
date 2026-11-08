import { z } from 'zod';

export const updateMemberSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  middleName: z.string().max(100).optional(),
  dateOfBirth: z.string().date().optional(),
  gender: z.enum(['Male', 'Female']).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  secondaryBranchId: z.string().uuid('Invalid branch ID').nullable().optional(),
  secondaryAddress: z.string().optional(),
  secondaryCity: z.string().max(100).optional(),
  secondaryPostalCode: z.string().max(20).optional(),
  profession: z.string().max(150).optional(),
  emergencyContactName: z.string().max(150).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
  emergencyContactRelationship: z.enum(['Spouse', 'Partner', 'Parent', 'Child', 'Sibling', 'Grandparent', 'Guardian', 'Friend', 'Other']).optional(),
  photoUrl: z.string().max(270000).refine(
    (v) => /^https?:\/\//.test(v) || /^data:image\/(jpeg|png|webp|gif);base64,/.test(v),
    { message: 'photoUrl must be an http/https URL or a base64 JPEG/PNG/WebP/GIF data URI' }
  ).optional(),
});

export const approveMemberSchema = z.object({
  approved: z.boolean(),
});

// Task #33 P1: set or clear the membership-class completion timestamp.
// `completedAt: null` clears it (admin un-marks a previously-marked member).
// Accepts an ISO-8601 instant; the date the class was completed.
export const setMembershipClassSchema = z.object({
  completedAt: z.string().datetime({ offset: true }).nullable(),
});

export const assignRoleSchema = z.object({
  roleId: z.string().uuid('Invalid role ID'),
  branchId: z.string().uuid('Invalid branch ID'),
  notes: z.string().optional(),
});

export const createMemberSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  homeBranchId: z.string().uuid('Invalid branch ID'),
  phone: z.string().max(20).optional(),
  gender: z.enum(['Male', 'Female']).optional(),
  dateOfBirth: z.string().date().optional(),
  middleName: z.string().max(100).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  emergencyContactName: z.string().max(150).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
  emergencyContactRelationship: z.enum(['Spouse', 'Partner', 'Parent', 'Child', 'Sibling', 'Grandparent', 'Guardian', 'Friend', 'Other']).optional(),
  secondaryBranchId: z.string().uuid('Invalid branch ID').nullable().optional(),
  secondaryAddress: z.string().optional(),
  secondaryCity: z.string().max(100).optional(),
  secondaryPostalCode: z.string().max(20).optional(),
  // No `systemRole` key, deliberately. This route is gated on `branch:write`,
  // not on admin, so accepting it from the body let anyone who could add a
  // member mint a fully-approved global admin — and read its generated
  // password straight out of the response. (The enum also still listed
  // 'pastor' and 'leader', which stopped being system roles at the 2026-06
  // RBAC rebuild.) Authority lives in `member_roles` grants; assign it there.
});

// ── CSV import ─────────────────────────────────────────────

// POST /api/members/import had no validator at all: the handler read the
// multipart body by hand and the service trusted every CSV cell.
export const importMembersFormSchema = z.object({
  file: z
    .instanceof(File, { message: 'CSV file is required' })
    .refine((f) => f.size > 0, 'CSV file is empty')
    .refine((f) => f.size <= 5_000_000, 'CSV file must be 5MB or smaller'),
});

/**
 * One parsed CSV row. Unknown columns are stripped rather than rejected —
 * `exportMembersCsv` emits `systemRole` and `approvalStatus`, so an
 * export → import round trip has to keep working. Those columns simply carry
 * no authority: `systemRole` is never read from input (see
 * `createMemberSchema` above) and approval is decided server-side.
 */
export const importMemberRowSchema = z.object({
  firstName: z.string().min(1, 'firstName is required').max(100),
  lastName: z.string().min(1, 'lastName is required').max(100),
  email: z.string().email('email is not a valid email address'),
  homeBranchId: z.string().uuid('homeBranchId must be a branch UUID').optional(),
  phone: z.string().max(20).optional(),
  gender: z.enum(['Male', 'Female'], { message: 'gender must be Male or Female' }).optional(),
  dateOfBirth: z.string().date('dateOfBirth must be YYYY-MM-DD').optional(),
  middleName: z.string().max(100).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  emergencyContactName: z.string().max(150).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
  emergencyContactRelationship: z
    .enum(['Spouse', 'Partner', 'Parent', 'Child', 'Sibling', 'Grandparent', 'Guardian', 'Friend', 'Other'], {
      message: 'emergencyContactRelationship is not a recognised relationship',
    })
    .optional(),
});

export type ImportMemberRow = z.infer<typeof importMemberRowSchema>;

// Health record upsert — all fields optional/nullable. Consent flags are
// tri-state (true / false / null = not yet recorded). branchId and consent
// provenance are derived server-side.
export const upsertHealthRecordSchema = z.object({
  medicalConditions: z.string().max(2000).nullable().optional(),
  allergies: z.string().max(2000).nullable().optional(),
  medications: z.string().max(2000).nullable().optional(),
  dietaryNeeds: z.string().max(2000).nullable().optional(),
  additionalNotes: z.string().max(2000).nullable().optional(),
  photoMediaConsent: z.boolean().nullable().optional(),
  medicalTreatmentConsent: z.boolean().nullable().optional(),
  dataProcessingConsent: z.boolean().nullable().optional(),
});

export const listMembersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  search: z.string().optional(),
  branchId: z.string().uuid().optional(),
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
  fellowshipId: z.string().uuid().optional(),
  // Directory now covers Members + Attendees (approved humans with sign-in
  // accounts). Visitor/child shells stay on their dedicated surfaces (Forms,
  // Safeguarding review). Pass to narrow to one type.
  memberType: z.enum(['member', 'attendee']).optional(),
});

export const unguardedMinorsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
});

// Task #4 Phase B: SG Lead decision on a dormant minor.
export const reviewMinorSchema = z.object({
  decision: z.enum(['active', 'archived']),
});

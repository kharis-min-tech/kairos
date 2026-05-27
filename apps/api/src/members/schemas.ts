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
  systemRole: z.enum(['admin', 'pastor', 'leader', 'member']).optional().default('member'),
});

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
});

export const unguardedMinorsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
});

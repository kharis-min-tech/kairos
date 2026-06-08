import { z } from 'zod';

// ── Outreach Programs ──────────────────────────────────────

export const createProgramSchema = z.object({
  programName: z.string().min(1, 'Program name is required').max(200),
  programDate: z.string().date('Invalid date format'),
  location: z.string().min(1, 'Location is required').max(300),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  description: z.string().optional(),
  coordinatorId: z.string().optional(), // Can be UUID or "KHARIS"
  branchId: z.string().uuid('Invalid branch ID').optional(), // Required for Admin, auto-set for Pastor
  // Optional attribution: program is organized for/by this fellowship or department.
  fellowshipId: z.string().uuid().nullable().optional(),
  branchDepartmentId: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
  isOpenToAllBranches: z.boolean().optional(),
});

export const updateProgramSchema = z.object({
  programName: z.string().min(1).max(200).optional(),
  programDate: z.string().date().optional(),
  location: z.string().min(1).max(300).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  description: z.string().optional(),
  coordinatorId: z.string().uuid().optional(),
  fellowshipId: z.string().uuid().nullable().optional(),
  branchDepartmentId: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
  isCompleted: z.boolean().optional(),
  isOpenToAllBranches: z.boolean().optional(),
});

export const listProgramsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  search: z.string().optional(),
  branchId: z.string().uuid().optional(),
  isCompleted: z.coerce.boolean().optional(),
  coordinatorId: z.string().uuid().optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});

export const registerWorkerSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
  role: z.string().max(50).optional(),
  notes: z.string().optional(),
});

// ── Souls ──────────────────────────────────────────────────

export const captureSoulSchema = z.object({
  outreachId: z.string().uuid('Invalid outreach ID').nullable().optional(),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string()
    .min(1, 'Phone is required')
    .max(20)
    .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone format'),
  email: z.string().email('Invalid email address').max(100).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  gender: z.enum(['Male', 'Female']).optional(),
  ageRange: z.string().max(20).optional(),
  notes: z.string().optional(),
  // Optional direct attribution — captured on behalf of this fellowship/dept.
  fellowshipId: z.string().uuid().nullable().optional(),
  branchDepartmentId: z.string().uuid().nullable().optional(),
});

export const updateSoulStatusSchema = z.object({
  status: z.enum(['New', 'Following Up', 'Interested', 'Not Interested', 'Converted', 'Lost Contact']),
  convertedToMemberId: z.string().uuid('Invalid member ID').optional(),
});

export const reassignSoulSchema = z.object({
  assignedMemberId: z.string().uuid('Invalid member ID'),
});

export const bulkReassignSoulsSchema = z.object({
  soulIds: z.array(z.string().uuid('Invalid soul ID')).min(1, 'At least one soul ID is required'),
  assignedMemberId: z.string().uuid('Invalid member ID'),
});

export const listSoulsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  search: z.string().optional(),
  status: z.enum(['New', 'Following Up', 'Interested', 'Not Interested', 'Converted', 'Lost Contact']).optional(),
  assignedMemberId: z.string().uuid().optional(),
  outreachId: z.string().uuid().optional(),
  overdueOnly: z.coerce.boolean().optional(),
  // Persona-aware filters layered on top of role scope.
  branchId: z.string().uuid().optional(),
  fellowshipId: z.string().uuid().optional(),
  branchDepartmentId: z.string().uuid().optional(),
});

// ── Follow-ups ─────────────────────────────────────────────

export const logFollowUpSchema = z.object({
  contactMethod: z.string().min(1, 'Contact method is required').max(100),
  contactStatus: z.enum(['Successful', 'No Answer', 'Busy', 'Wrong Number', 'Declined']),
  urgencyLevel: z.enum(['RED', 'AMBER', 'GREEN']).optional(),
  durationMinutes: z.coerce.number().int().min(1, 'Duration must be at least 1 minute').optional(),
  notes: z.string().optional(),
  nextFollowUpDate: z.string().date().optional(),
  updateStatus: z.enum(['New', 'Following Up', 'Interested', 'Not Interested', 'Converted', 'Lost Contact']).optional(),
});

export const listFollowUpsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  soulId: z.string().uuid().optional(),
});


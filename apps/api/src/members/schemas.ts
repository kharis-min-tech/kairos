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
  emergencyContactName: z.string().max(150).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
  photoUrl: z.string().url().max(255).optional(),
});

export const approveMemberSchema = z.object({
  approved: z.boolean(),
});

export const assignRoleSchema = z.object({
  roleId: z.string().uuid('Invalid role ID'),
  branchId: z.string().uuid('Invalid branch ID'),
  notes: z.string().optional(),
});

export const listMembersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  branchId: z.string().uuid().optional(),
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
});

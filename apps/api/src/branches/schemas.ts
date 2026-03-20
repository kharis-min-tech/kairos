import { z } from 'zod';

const serviceScheduleItemSchema = z.object({
  day: z.string().min(1),
  time: z.string().min(1),
  type: z.string().min(1),
});

export const createBranchSchema = z.object({
  branchName: z.string().min(1, 'Branch name is required').max(150),
  regionId: z.string().uuid('Invalid region ID'),
  branchType: z.enum(['Main', 'Satellite', 'Cell', 'Campus', 'Online']).optional().default('Main'),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(100).optional(),
  establishedDate: z.string().optional(),
  serviceSchedule: z.array(serviceScheduleItemSchema).optional(),
});

export const updateBranchSchema = createBranchSchema.partial();

export const createRegionSchema = z.object({
  regionName: z.string().min(1, 'Region name is required').max(100),
  country: z.string().min(1, 'Country is required').max(100),
});

export const updateRegionSchema = createRegionSchema.partial();

export const assignLeadershipSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
  role: z.enum(['Main Pastor', 'Elder']),
  startDate: z.string().optional(),
});

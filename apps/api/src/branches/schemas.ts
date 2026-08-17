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
  // Self-check-in configuration — tuned per branch via the mobile My-Branch
  // screen. Bounds mirror the DB CHECK constraints in migration 0041.
  selfCheckInEnabled: z.boolean().optional(),
  selfCheckInOpenMinutesBefore: z.number().int().min(0).max(240).optional(),
  selfCheckInCloseMinutesAfter: z.number().int().min(0).max(480).optional(),
  selfCheckInLateAfterMinutes: z.number().int().min(0).max(480).optional(),
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

export const getLeadershipQuerySchema = z.object({
  includeHistory: z.coerce.boolean().optional().default(false),
});

/**
 * Body for assigning the Branch System Admin role to a member.
 * The branch is read from the URL param so the body stays minimal.
 */
export const assignBranchRoleSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
});

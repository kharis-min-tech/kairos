import { z } from 'zod';

const fellowshipTypes = [
  'K-Groups',
  'Kharis Express',
  'New Breeds',
  'Kharis on Campus',
  'Kharis on Campus Colleges',
] as const;

export const createFellowshipSchema = z.object({
  fellowshipName: z.string().min(1).max(150),
  branchId: z.string().uuid(),
  fellowshipType: z.enum(fellowshipTypes),
  description: z.string().optional(),
  leaderId: z.string().uuid().optional(),
  coLeaderId: z.string().uuid().optional(),
  meetingSchedule: z.string().max(200).optional(),
  meetingDay: z.string().max(20).optional(),
  meetingTime: z.string().max(10).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  country: z.string().max(100).optional(),
});

export const updateFellowshipSchema = createFellowshipSchema.partial();

export const createMeetingSchema = z.object({
  meetingDate: z.string().min(1),
  meetingTitle: z.string().max(200).optional(),
  meetingTopic: z.string().max(200).optional(),
  meetingNotes: z.string().optional(),
  location: z.string().max(200).optional(),
  durationMinutes: z.coerce.number().int().positive().optional(),
});

export const updateMeetingSchema = createMeetingSchema.partial();

export const addMemberSchema = z.object({
  memberId: z.string().uuid(),
  notes: z.string().optional(),
});

export const recordAttendanceSchema = z.object({
  records: z.array(
    z.object({
      memberId: z.string().uuid(),
      attendanceStatus: z.enum(['Present', 'Absent', 'Excused', 'Late']),
      notes: z.string().optional(),
    }),
  ).min(1),
});

export const listFellowshipsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  fellowshipType: z.enum(fellowshipTypes).optional(),
  branchId: z.string().uuid().optional(),
  memberId: z.string().uuid().optional(),
});

export const createJoinRequestSchema = z.object({
  notes: z.string().max(500).optional(),
});

export const reviewJoinRequestSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes: z.string().max(500).optional(),
});

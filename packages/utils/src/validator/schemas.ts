// @kairos/validator - Zod schemas for all API request types

import { z } from 'zod';
import { phoneSchema, nonEmptyString, positiveAmount } from './custom-validators';

// ============================================================
// Member Schemas
// ============================================================

/** Schema for creating a new member */
export const memberCreateSchema = z.object({
  first_name: nonEmptyString.max(100),
  last_name: nonEmptyString.max(100),
  middle_name: z.string().trim().max(100).optional(),
  email: z.email('Invalid email format').optional(),
  phone: phoneSchema.optional(),
  date_of_birth: z.coerce.date().max(new Date(), 'Date of birth cannot be in the future').optional(),
  gender: z.enum(['Male', 'Female']).optional(),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  postal_code: z.string().trim().max(20).optional(),
  home_branch_id: z.number().int().positive(),
  photo_url: z.string().url().optional(),
  emergency_contact_name: z.string().trim().max(200).optional(),
  emergency_contact_phone: phoneSchema.optional(),
});

/** Schema for updating a member */
export const memberUpdateSchema = z.object({
  first_name: nonEmptyString.max(100).optional(),
  last_name: nonEmptyString.max(100).optional(),
  middle_name: z.string().trim().max(100).optional(),
  email: z.email('Invalid email format').optional(),
  phone: phoneSchema.optional(),
  date_of_birth: z.coerce.date().max(new Date(), 'Date of birth cannot be in the future').optional(),
  gender: z.enum(['Male', 'Female']).optional(),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  postal_code: z.string().trim().max(20).optional(),
  photo_url: z.string().url().optional(),
  emergency_contact_name: z.string().trim().max(200).optional(),
  emergency_contact_phone: phoneSchema.optional(),
});

// ============================================================
// Branch Schemas
// ============================================================

/** Schema for creating a branch */
export const branchCreateSchema = z.object({
  branch_name: nonEmptyString.max(200),
  region_id: z.number().int().positive(),
  branch_type: z.enum(['Main', 'Satellite', 'Cell', 'Campus', 'Online']),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  postal_code: z.string().trim().max(20).optional(),
  phone: phoneSchema.optional(),
  email: z.email('Invalid email format').optional(),
  established_date: z.coerce.date().optional(),
});

// ============================================================
// Department Schemas
// ============================================================

/** Schema for creating a global department definition */
export const departmentCreateSchema = z.object({
  department_name: nonEmptyString.max(200),
  description: z.string().trim().max(1000).optional(),
});

/** Schema for creating a branch department instance */
export const branchDepartmentCreateSchema = z.object({
  branch_id: z.number().int().positive(),
  department_id: z.number().int().positive(),
  lead_member_id: z.number().int().positive(),
  deputy_member_id: z.number().int().positive().optional(),
}).refine(
  (data) => !data.deputy_member_id || data.lead_member_id !== data.deputy_member_id,
  {
    message: 'Lead and deputy must be different members',
    path: ['deputy_member_id'],
  }
);

// ============================================================
// Fellowship Schemas
// ============================================================

/** Schema for creating a fellowship */
export const fellowshipCreateSchema = z.object({
  fellowship_name: nonEmptyString.max(200),
  branch_id: z.number().int().positive(),
  fellowship_type: z.enum([
    'K-Groups',
    'Kharis Express',
    'New Breeds',
    'Kharis on Campus',
    'Kharis on Campus Colleges',
  ]),
  description: z.string().trim().max(1000).optional(),
  leader_id: z.number().int().positive().optional(),
  co_leader_id: z.number().int().positive().optional(),
  meeting_schedule: z.string().trim().max(500).optional(),
  location: z.string().trim().max(500).optional(),
});

// ============================================================
// Attendance Schemas
// ============================================================

/** Schema for creating a service */
export const serviceCreateSchema = z.object({
  branch_id: z.number().int().positive(),
  service_date: z.coerce.date(),
  service_type: z.enum(['Sunday Service', 'Midweek Service', 'Special Service', 'Prayer Meeting', 'Other']),
  service_title: z.string().trim().max(200).optional(),
  preacher_id: z.number().int().positive().optional(),
  topic: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
  expected_attendance: z.number().int().nonnegative().optional(),
});

/** Schema for recording service attendance (bulk) */
export const serviceAttendanceBulkSchema = z.object({
  service_id: z.number().int().positive(),
  records: z.array(z.object({
    member_id: z.number().int().positive(),
    attendance_status: z.enum(['Present', 'Absent', 'Virtual']),
    is_first_time_visitor: z.boolean().default(false),
    notes: z.string().trim().max(500).optional(),
  })).min(1, 'At least one attendance record is required'),
});

/** Schema for recording service attendance */
export const attendanceRecordSchema = z.object({
  service_id: z.number().int().positive(),
  member_id: z.number().int().positive(),
  attendance_status: z.enum(['Present', 'Absent', 'Virtual']),
  is_first_time: z.boolean().default(false),
  notes: z.string().trim().max(500).optional(),
});

/** Schema for creating a fellowship meeting */
export const fellowshipMeetingCreateSchema = z.object({
  fellowship_id: z.number().int().positive(),
  meeting_date: z.coerce.date(),
  meeting_title: z.string().trim().max(200).optional(),
  meeting_topic: z.string().trim().max(200).optional(),
  meeting_notes: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(200).optional(),
  duration_minutes: z.number().int().positive().optional(),
});

/** Schema for recording fellowship meeting attendance (bulk) */
export const fellowshipAttendanceBulkSchema = z.object({
  meeting_id: z.number().int().positive(),
  records: z.array(z.object({
    member_id: z.number().int().positive(),
    attendance_status: z.enum(['Present', 'Absent', 'Excused', 'Late']),
    notes: z.string().trim().max(500).optional(),
  })).min(1, 'At least one attendance record is required'),
});

/** Schema for recording fellowship meeting attendance */
export const fellowshipAttendanceRecordSchema = z.object({
  meeting_id: z.number().int().positive(),
  member_id: z.number().int().positive(),
  attendance_status: z.enum(['Present', 'Absent', 'Excused', 'Late']),
  notes: z.string().trim().max(500).optional(),
});

// ============================================================
// Soul Capture Schemas
// ============================================================

// ============================================================
// Outreach Schemas
// ============================================================

/** Schema for creating an outreach program */
export const outreachProgramCreateSchema = z.object({
  branch_id: z.number().int().positive(),
  program_name: nonEmptyString.max(200),
  program_date: z.coerce.date(),
  location: nonEmptyString.max(300),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  description: z.string().trim().max(2000).optional(),
  coordinator_id: z.number().int().positive().optional(),
  notes: z.string().trim().max(2000).optional(),
});

/** Schema for registering a worker for an outreach program */
export const outreachWorkerRegisterSchema = z.object({
  outreach_id: z.number().int().positive(),
  member_id: z.number().int().positive(),
  role: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(500).optional(),
});

/** Schema for completing an outreach program (no body — outreachId from path) */
export const outreachCompleteSchema = z.object({});

/** Schema for capturing a soul */
export const soulCaptureSchema = z.object({
  first_name: nonEmptyString.max(100),
  last_name: nonEmptyString.max(100),
  phone: phoneSchema,
  email: z.email('Invalid email format').optional(),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  gender: z.enum(['Male', 'Female']).optional(),
  age_range: z.string().trim().max(20).optional(),
  outreach_id: z.number().int().positive().optional(),
  notes: z.string().trim().max(2000).optional(),
});

/** Schema for logging a follow-up */
export const followUpCreateSchema = z.object({
  soul_id: z.number().int().positive(),
  contact_date: z.coerce.date(),
  contact_method: z.enum([
    'Phone Call',
    'Text Message',
    'Email',
    'WhatsApp',
    'In-Person Visit',
    'Other',
  ]),
  contact_status: z.enum([
    'Successful',
    'No Answer',
    'Wrong Number',
    'Call Back Later',
    'Not Interested',
    'Interested',
  ]),
  duration_minutes: z.number().int().positive().optional(),
  notes: z.string().trim().max(2000).optional(),
  next_follow_up_date: z.coerce.date().optional(),
});

/** Schema for updating soul status */
export const soulStatusUpdateSchema = z.object({
  status: z.enum(['New', 'Following Up', 'Interested', 'Converted', 'Not Interested']),
  converted_to_member_id: z.number().int().positive().optional(),
}).refine(
  (data) => data.status !== 'Converted' || data.converted_to_member_id !== undefined,
  {
    message: 'converted_to_member_id is required when status is "Converted"',
    path: ['converted_to_member_id'],
  }
);

/** Schema for reassigning a soul */
export const soulReassignSchema = z.object({
  assigned_member_id: z.number().int().positive(),
});

// ============================================================
// Donation Schemas
// ============================================================

/** Schema for creating an online donation */
export const donationCreateSchema = z
  .object({
    member_id: z.number().int().positive().optional(),
    branch_id: z.number().int().positive(),
    amount: positiveAmount,
    currency: z.literal('GBP').default('GBP'),
    donation_date: z.coerce.date(),
    donation_purpose: z.enum(['Offering', 'Tithe', 'Building Fund', 'Other']),
    description: z.string().trim().max(500).optional(),
    payment_method: z.enum([
      'Cash',
      'Check',
      'Bank Transfer',
      'Mobile Money',
      'Card',
      'Online',
      'Other',
    ]),
    is_anonymous: z.boolean().default(false),
    stripe_payment_id: z.string().optional(),
  })
  .refine(
    (data) =>
      data.donation_purpose !== 'Other' ||
      (data.description !== undefined && data.description.trim().length > 0),
    {
      message: 'Description is required when donation purpose is "Other"',
      path: ['description'],
    }
  );

// ============================================================
// Form Schemas
// ============================================================

/** Schema for creating a form */
export const formCreateSchema = z
  .object({
    form_name: nonEmptyString.max(200),
    form_description: z.string().trim().max(1000).optional(),
    form_definition: z.record(z.string(), z.unknown()),
    scope: z.enum(['Church-wide', 'Branch-specific']),
    target_branch_id: z.number().int().positive().optional(),
  })
  .refine(
    (data) =>
      data.scope !== 'Branch-specific' || data.target_branch_id !== undefined,
    {
      message: 'target_branch_id is required for branch-specific forms',
      path: ['target_branch_id'],
    }
  );

/** Schema for submitting a form */
export const formSubmitSchema = z.object({
  form_id: z.number().int().positive(),
  submission_data: z.record(z.string(), z.unknown()),
});

// ============================================================
// Notification Schemas
// ============================================================

/** Schema for creating a notification */
export const notificationCreateSchema = z
  .object({
    title: nonEmptyString.max(200),
    message: nonEmptyString.max(5000),
    notification_type: z.enum([
      'Announcement',
      'Reminder',
      'Alert',
      'Event',
      'General',
    ]),
    priority: z.enum(['Low', 'Normal', 'High', 'Urgent']).default('Normal'),
    target_scope: z.enum([
      'All',
      'Branch',
      'Region',
      'Department',
      'Fellowship',
      'Role',
      'Leadership',
    ]),
    target_branch_id: z.number().int().positive().optional(),
    target_region_id: z.number().int().positive().optional(),
    target_department_id: z.number().int().positive().optional(),
    target_fellowship_id: z.number().int().positive().optional(),
    target_role_id: z.number().int().positive().optional(),
    target_leadership_role: z.string().trim().optional(),
    scheduled_for: z.coerce.date().optional(),
    expires_at: z.coerce.date().optional(),
  })
  .refine(
    (data) => data.target_scope !== 'Branch' || data.target_branch_id !== undefined,
    {
      message: 'target_branch_id is required when target_scope is "Branch"',
      path: ['target_branch_id'],
    }
  )
  .refine(
    (data) => data.target_scope !== 'Department' || data.target_department_id !== undefined,
    {
      message: 'target_department_id is required when target_scope is "Department"',
      path: ['target_department_id'],
    }
  )
  .refine(
    (data) => data.target_scope !== 'Fellowship' || data.target_fellowship_id !== undefined,
    {
      message: 'target_fellowship_id is required when target_scope is "Fellowship"',
      path: ['target_fellowship_id'],
    }
  );

// ============================================================
// Inferred Types
// ============================================================

export type MemberCreateInput = z.infer<typeof memberCreateSchema>;
export type MemberUpdateInput = z.infer<typeof memberUpdateSchema>;
export type BranchCreateInput = z.infer<typeof branchCreateSchema>;
export type DepartmentCreateInput = z.infer<typeof departmentCreateSchema>;
export type BranchDepartmentCreateInput = z.infer<typeof branchDepartmentCreateSchema>;
export type FellowshipCreateInput = z.infer<typeof fellowshipCreateSchema>;
export type ServiceCreateInput = z.infer<typeof serviceCreateSchema>;
export type ServiceAttendanceBulkInput = z.infer<typeof serviceAttendanceBulkSchema>;
export type AttendanceRecordInput = z.infer<typeof attendanceRecordSchema>;
export type FellowshipMeetingCreateInput = z.infer<typeof fellowshipMeetingCreateSchema>;
export type FellowshipAttendanceBulkInput = z.infer<typeof fellowshipAttendanceBulkSchema>;
export type FellowshipAttendanceRecordInput = z.infer<typeof fellowshipAttendanceRecordSchema>;
export type OutreachProgramCreateInput = z.infer<typeof outreachProgramCreateSchema>;
export type OutreachWorkerRegisterInput = z.infer<typeof outreachWorkerRegisterSchema>;
export type OutreachCompleteInput = z.infer<typeof outreachCompleteSchema>;
export type SoulCaptureInput = z.infer<typeof soulCaptureSchema>;
export type FollowUpCreateInput = z.infer<typeof followUpCreateSchema>;
export type SoulStatusUpdateInput = z.infer<typeof soulStatusUpdateSchema>;
export type SoulReassignInput = z.infer<typeof soulReassignSchema>;
export type DonationCreateInput = z.infer<typeof donationCreateSchema>;
export type FormCreateInput = z.infer<typeof formCreateSchema>;
export type FormSubmitInput = z.infer<typeof formSubmitSchema>;
export type NotificationCreateInput = z.infer<typeof notificationCreateSchema>;

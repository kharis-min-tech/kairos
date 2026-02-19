// @kairos/types - Shared entity interfaces for the Kairos platform
// These align with the Drizzle schemas being created in packages/database/

import type {
  BranchType,
  Gender,
  LeadershipRole,
  ServiceType,
  ServiceAttendanceStatus,
  SoulStatus,
  ContactMethod,
  ContactStatus,
  DonationPurpose,
  PaymentMethod,
  FormScope,
  NotificationType,
  NotificationPriority,
  TargetScope,
} from './enums';

/** Base fields present on most entities */
export interface BaseEntity {
  created_at: Date;
  updated_at: Date;
}

/** Region entity */
export interface Region extends BaseEntity {
  region_id: number;
  region_name: string;
  country: string;
}

/** Branch entity */
export interface Branch extends BaseEntity {
  branch_id: number;
  branch_name: string;
  region_id: number;
  branch_type: BranchType;
  address?: string;
  city?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  established_date?: Date;
  is_active: boolean;
}

/** Member entity */
export interface Member extends BaseEntity {
  member_id: number;
  first_name: string;
  last_name: string;
  middle_name?: string;
  date_of_birth?: Date;
  gender?: Gender;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  home_branch_id: number;
  membership_date: Date;
  is_active: boolean;
  photo_url?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

/** Branch leadership entity */
export interface BranchLeadership extends BaseEntity {
  leadership_id: number;
  branch_id: number;
  member_id: number;
  role: LeadershipRole;
  start_date: Date;
  end_date?: Date;
  is_current: boolean;
}

/** Department entity (global definition) */
export interface Department extends BaseEntity {
  department_id: number;
  department_name: string;
  description?: string;
  is_active: boolean;
}

/** Branch department instance */
export interface BranchDepartment extends BaseEntity {
  branch_department_id: number;
  branch_id: number;
  department_id: number;
  lead_member_id: number;
  deputy_member_id?: number;
  is_active: boolean;
}

/** Fellowship entity */
export interface Fellowship extends BaseEntity {
  fellowship_id: number;
  fellowship_name: string;
  branch_id: number;
  description?: string;
  leader_id?: number;
  co_leader_id?: number;
  meeting_schedule?: string;
  is_active: boolean;
}

/** Service entity */
export interface Service extends BaseEntity {
  service_id: number;
  branch_id: number;
  service_date: Date;
  service_type: ServiceType;
  service_time?: string;
  notes?: string;
  created_by?: number;
}

/** Service attendance record */
export interface ServiceAttendance {
  service_id: number;
  member_id: number;
  attendance_status: ServiceAttendanceStatus;
  is_first_time: boolean;
  arrival_time?: Date;
  notes?: string;
  recorded_at: Date;
  recorded_by?: number;
}

/** Outreach program entity */
export interface OutreachProgram extends BaseEntity {
  outreach_id: number;
  branch_id: number;
  program_name: string;
  program_date: Date;
  location: string;
  address?: string;
  city?: string;
  description?: string;
  coordinator_id?: number;
  total_souls_reached: number;
  notes?: string;
  is_completed: boolean;
}

/** Soul entity */
export interface Soul extends BaseEntity {
  soul_id: number;
  outreach_id?: number;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  capture_date: Date;
  capture_location?: string;
  assigned_member_id?: number;
  status: SoulStatus;
  converted_to_member_id?: number;
  conversion_date?: Date;
  notes?: string;
}

/** Follow-up record */
export interface FollowUp {
  followup_id: number;
  soul_id: number;
  contact_date: Date;
  contact_method: ContactMethod;
  contact_status: ContactStatus;
  duration_minutes?: number;
  notes?: string;
  followed_up_by?: number;
  created_at: Date;
}

/** Donation entity */
export interface Donation extends BaseEntity {
  donation_id: number;
  member_id?: number;
  branch_id: number;
  amount: number;
  currency: string;
  donation_date: Date;
  donation_purpose: DonationPurpose;
  description?: string;
  payment_method: PaymentMethod;
  stripe_payment_id?: string;
  is_anonymous: boolean;
  recorded_by?: number;
}

/** Form entity */
export interface Form extends BaseEntity {
  form_id: number;
  form_name: string;
  form_description?: string;
  form_definition: Record<string, unknown>;
  scope: FormScope;
  target_branch_id?: number;
  is_active: boolean;
  created_by?: number;
}

/** Form submission entity */
export interface FormSubmission {
  submission_id: number;
  form_id: number;
  member_id?: number;
  submission_data: Record<string, unknown>;
  submitted_at: Date;
}

/** Notification entity */
export interface Notification extends BaseEntity {
  notification_id: number;
  title: string;
  message: string;
  notification_type: NotificationType;
  priority: NotificationPriority;
  target_scope: TargetScope;
  target_branch_id?: number;
  target_region_id?: number;
  target_department_id?: number;
  target_fellowship_id?: number;
  target_role_id?: number;
  target_leadership_role?: string;
  sent_by?: number;
  sent_at: Date;
  scheduled_for?: Date;
  expires_at?: Date;
  is_active: boolean;
}

/** Notification recipient */
export interface NotificationRecipient {
  recipient_id: number;
  notification_id: number;
  member_id: number;
  is_read: boolean;
  read_at?: Date;
  is_dismissed: boolean;
  dismissed_at?: Date;
}

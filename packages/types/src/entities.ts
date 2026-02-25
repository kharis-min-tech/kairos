// @kairos/types - Shared entity interfaces for the Kairos platform
// These align with the Drizzle schemas in packages/database/src/schema/
// All field names use camelCase to match Drizzle ORM query output.

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
  createdAt: Date;
  updatedAt: Date;
}

/** Region entity — matches schema/core.ts regions */
export interface Region extends BaseEntity {
  regionId: number;
  regionName: string;
  country: string;
}

/** Branch entity — matches schema/core.ts branches */
export interface Branch extends BaseEntity {
  branchId: number;
  branchName: string;
  regionId: number;
  branchType: BranchType;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  establishedDate?: Date;
  isActive: boolean;
}

/** Member entity — matches schema/core.ts members */
export interface Member extends BaseEntity {
  memberId: number;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  homeBranchId: number;
  membershipDate: Date;
  isActive: boolean;
  photoUrl?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

/** Branch leadership entity — matches schema/core.ts branchLeadership */
export interface BranchLeadership extends BaseEntity {
  leadershipId: number;
  branchId: number;
  memberId: number;
  role: LeadershipRole;
  startDate: Date;
  endDate?: Date;
  isCurrent: boolean;
}

/** Department entity (global definition) — matches schema/departments.ts departments */
export interface Department extends BaseEntity {
  departmentId: number;
  departmentName: string;
  description?: string;
  isActive: boolean;
}

/** Branch department instance — matches schema/departments.ts branchDepartments */
export interface BranchDepartment extends BaseEntity {
  branchDepartmentId: number;
  branchId: number;
  departmentId: number;
  leadMemberId: number;
  deputyMemberId?: number;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
}

/** Fellowship entity — matches schema/fellowships.ts fellowships */
export interface Fellowship extends BaseEntity {
  fellowshipId: number;
  fellowshipName: string;
  branchId: number;
  description?: string;
  leaderId?: number;
  coLeaderId?: number;
  meetingSchedule?: string;
  isActive: boolean;
}

/** Service entity — matches schema/attendance.ts services */
export interface Service extends BaseEntity {
  serviceId: number;
  branchId: number;
  serviceDate: Date;
  serviceType: ServiceType;
  serviceTitle?: string;
  preacherId?: number;
  topic?: string;
  notes?: string;
  expectedAttendance?: number;
}

/** Service attendance record — matches schema/attendance.ts serviceAttendance */
export interface ServiceAttendance {
  serviceId: number;
  memberId: number;
  attendanceStatus: ServiceAttendanceStatus;
  isFirstTimeVisitor: boolean;
  arrivalTime?: Date;
  notes?: string;
  recordedAt: Date;
  recordedBy?: number;
}

/** Outreach program entity — matches schema/outreach.ts outreachPrograms */
export interface OutreachProgram extends BaseEntity {
  outreachId: number;
  branchId: number;
  programName: string;
  programDate: Date;
  location: string;
  address?: string;
  city?: string;
  description?: string;
  coordinatorId?: number;
  totalSoulsReached: number;
  notes?: string;
  isCompleted: boolean;
}

/** Soul entity — matches schema/outreach.ts souls */
export interface Soul extends BaseEntity {
  soulId: number;
  outreachId?: number;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  gender?: string;
  ageRange?: string;
  assignedMemberId?: number;
  status: SoulStatus;
  convertedToMemberId?: number;
  notes?: string;
}

/** Follow-up record — matches schema/outreach.ts followUps */
export interface FollowUp extends BaseEntity {
  followUpId: number;
  soulId: number;
  memberId: number;
  followUpDate: Date;
  contactMethod: ContactMethod;
  contactStatus: ContactStatus;
  durationMinutes?: number;
  notes?: string;
  nextFollowUpDate?: Date;
}

/** Donation entity — matches schema/donations.ts donations */
export interface Donation extends BaseEntity {
  donationId: number;
  memberId?: number;
  branchId: number;
  donationDate: Date;
  amount: number;
  currency: string;
  donationPurpose: DonationPurpose;
  description?: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  stripePaymentId?: string;
  status?: string;
  isAnonymous: boolean;
  notes?: string;
  recordedBy?: number;
}

/** Form entity — matches schema/forms.ts forms */
export interface Form extends BaseEntity {
  formId: number;
  formName: string;
  formDescription?: string;
  formDefinition: Record<string, unknown>;
  scope: FormScope;
  targetBranchId?: number;
  isActive: boolean;
  isTemplate?: boolean;
  createdBy?: number;
}

/** Form submission entity — matches schema/forms.ts formSubmissions */
export interface FormSubmission {
  submissionId: number;
  formId: number;
  memberId?: number;
  submissionData: Record<string, unknown>;
  submittedAt: Date;
}

/** Notification entity — matches schema/notifications.ts notifications */
export interface Notification extends BaseEntity {
  notificationId: number;
  title: string;
  message: string;
  notificationType: NotificationType;
  priority: NotificationPriority;
  targetScope: TargetScope;
  targetBranchId?: number;
  targetRegionId?: number;
  targetDepartmentId?: number;
  targetFellowshipId?: number;
  targetRoleId?: number;
  targetLeadershipRole?: string;
  sentBy: number;
  sentAt: Date;
  scheduledFor?: Date;
  expiresAt?: Date;
  isActive: boolean;
}

/** Notification recipient — matches schema/notifications.ts notificationRecipients */
export interface NotificationRecipient {
  notificationId: number;
  memberId: number;
  isRead: boolean;
  readAt?: Date;
  isDismissed: boolean;
  dismissedAt?: Date;
  createdAt: Date;
}

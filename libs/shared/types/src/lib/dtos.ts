// DTO (Data Transfer Object) type definitions for API requests and responses

import {
  UserType,
  Gender,
  MaritalStatus,
  SoulStatus,
  FollowUpType,
  EventType,
  PaymentType,
  PaymentMethod,
  PaymentStatus,
  RecurringFrequency,
  PledgeType,
  PledgeStatus,
  FormFieldType,
  AnnouncementPriority,
  MessageType,
} from './enums';

// User DTOs
export interface CreateUserDto {
  email: string;
  password: string;
  userType: UserType;
  mfaEnabled?: boolean;
}

export interface UpdateUserDto {
  email?: string;
  userType?: UserType;
  mfaEnabled?: boolean;
  isActive?: boolean;
}

export interface LoginDto {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

// Member DTOs
export interface CreateMemberDto {
  branchId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  membershipDate?: string;
  baptismDate?: string;
  soulStatus: SoulStatus;
}

export interface UpdateMemberDto {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  membershipDate?: string;
  baptismDate?: string;
  soulStatus?: SoulStatus;
  isActive?: boolean;
}

// Branch DTOs
export interface CreateBranchDto {
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface UpdateBranchDto {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}

// Department DTOs
export interface CreateDepartmentDto {
  branchId: string;
  name: string;
  description?: string;
  headOfDepartmentId?: string;
}

export interface UpdateDepartmentDto {
  name?: string;
  description?: string;
  headOfDepartmentId?: string;
  isActive?: boolean;
}

// Fellowship DTOs
export interface CreateFellowshipDto {
  branchId: string;
  name: string;
  description?: string;
  leaderId?: string;
  meetingDay?: string;
  meetingTime?: string;
  meetingLocation?: string;
  maxMembers?: number;
}

export interface UpdateFellowshipDto {
  name?: string;
  description?: string;
  leaderId?: string;
  meetingDay?: string;
  meetingTime?: string;
  meetingLocation?: string;
  maxMembers?: number;
  isActive?: boolean;
}

// Event DTOs
export interface CreateEventDto {
  branchId: string;
  name: string;
  description?: string;
  eventType: EventType;
  startDate: string;
  endDate?: string;
  location?: string;
  maxAttendees?: number;
  registrationRequired: boolean;
  registrationDeadline?: string;
  cost?: number;
}

export interface UpdateEventDto {
  name?: string;
  description?: string;
  eventType?: EventType;
  startDate?: string;
  endDate?: string;
  location?: string;
  maxAttendees?: number;
  registrationRequired?: boolean;
  registrationDeadline?: string;
  cost?: number;
  isActive?: boolean;
}

// Payment DTOs
export interface CreatePaymentDto {
  memberId: string;
  branchId: string;
  amount: number;
  currency: string;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  description?: string;
  reference?: string;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  nextPaymentDate?: string;
}

export interface UpdatePaymentDto {
  amount?: number;
  paymentType?: PaymentType;
  paymentMethod?: PaymentMethod;
  paymentDate?: string;
  description?: string;
  reference?: string;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  nextPaymentDate?: string;
  status?: PaymentStatus;
}

// Pledge DTOs
export interface CreatePledgeDto {
  memberId: string;
  branchId: string;
  amount: number;
  currency: string;
  pledgeType: PledgeType;
  startDate: string;
  endDate?: string;
  frequency: RecurringFrequency;
  description?: string;
}

export interface UpdatePledgeDto {
  amount?: number;
  pledgeType?: PledgeType;
  startDate?: string;
  endDate?: string;
  frequency?: RecurringFrequency;
  description?: string;
  status?: PledgeStatus;
}

// Form DTOs
export interface CreateFormDto {
  branchId: string;
  name: string;
  description?: string;
  allowMultipleSubmissions?: boolean;
  submissionDeadline?: string;
}

export interface UpdateFormDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  allowMultipleSubmissions?: boolean;
  submissionDeadline?: string;
}

export interface CreateFormFieldDto {
  formId: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: FormFieldType;
  isRequired: boolean;
  options?: string[];
  validation?: string;
  order: number;
}

export interface CreateFormSubmissionDto {
  formId: string;
  memberId?: string;
  answers: Array<{
    formFieldId: string;
    answer: string;
  }>;
}

// Announcement DTOs
export interface CreateAnnouncementDto {
  branchId: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  targetAudience: string[];
  publishDate: string;
  expiryDate?: string;
}

export interface UpdateAnnouncementDto {
  title?: string;
  content?: string;
  priority?: AnnouncementPriority;
  targetAudience?: string[];
  publishDate?: string;
  expiryDate?: string;
  isActive?: boolean;
}

// Message DTOs
export interface CreateMessageThreadDto {
  branchId: string;
  subject: string;
  participants: string[];
}

export interface CreateMessageDto {
  messageThreadId: string;
  content: string;
  messageType: MessageType;
  attachments?: string[];
}

// Soul and Follow-up DTOs
export interface CreateSoulDto {
  outreachProgramId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  soulStatus: SoulStatus;
  wonBy?: string;
  wonDate?: string;
  notes?: string;
}

export interface UpdateSoulDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  soulStatus?: SoulStatus;
  wonBy?: string;
  wonDate?: string;
  notes?: string;
}

export interface CreateFollowUpDto {
  soulId: string;
  followUpDate: string;
  followUpType: FollowUpType;
  notes?: string;
  nextFollowUpDate?: string;
}

// Role DTOs
export interface CreateRoleDto {
  name: string;
  description?: string;
  permissions: string[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissions?: string[];
}

export interface AssignRoleDto {
  userId: string;
  roleId: string;
}

// Attendance DTOs
export interface RecordAttendanceDto {
  memberId: string;
  attendanceDate: string;
  isPresent: boolean;
  notes?: string;
}

export interface BulkAttendanceDto {
  attendanceDate: string;
  attendances: Array<{
    memberId: string;
    isPresent: boolean;
    notes?: string;
  }>;
}

// Search and Filter DTOs
export interface SearchMembersDto {
  query?: string;
  branchId?: string;
  departmentId?: string;
  fellowshipId?: string;
  soulStatus?: SoulStatus;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface SearchEventsDto {
  query?: string;
  branchId?: string;
  eventType?: EventType;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface SearchPaymentsDto {
  memberId?: string;
  branchId?: string;
  paymentType?: PaymentType;
  paymentMethod?: PaymentMethod;
  status?: PaymentStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

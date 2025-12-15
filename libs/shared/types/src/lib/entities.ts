// Core entity interfaces for the Kairos Church Management System
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
  NotificationType,
  MessageType,
  AccessAction,
} from './enums';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  userType: UserType;
  mfaEnabled: boolean;
  lastLogin?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Member {
  id: string;
  userId?: string;
  branchId: string;
  membershipNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: Date;
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
  membershipDate?: Date;
  baptismDate?: Date;
  soulStatus: SoulStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Department {
  id: string;
  branchId: string;
  name: string;
  description?: string;
  headOfDepartmentId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepartmentMember {
  id: string;
  departmentId: string;
  memberId: string;
  role?: string;
  joinedAt: Date;
  leftAt?: Date;
  isActive: boolean;
}

export interface DepartmentAttendance {
  id: string;
  departmentId: string;
  memberId: string;
  attendanceDate: Date;
  isPresent: boolean;
  notes?: string;
  recordedBy: string;
  recordedAt: Date;
}

export interface Fellowship {
  id: string;
  branchId: string;
  name: string;
  description?: string;
  leaderId?: string;
  meetingDay?: string;
  meetingTime?: string;
  meetingLocation?: string;
  maxMembers?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FellowshipMember {
  id: string;
  fellowshipId: string;
  memberId: string;
  role?: string;
  joinedAt: Date;
  leftAt?: Date;
  isActive: boolean;
}

export interface FellowshipMeeting {
  id: string;
  fellowshipId: string;
  meetingDate: Date;
  topic?: string;
  notes?: string;
  attendanceCount: number;
  createdBy: string;
  createdAt: Date;
}

export interface FellowshipAttendance {
  id: string;
  fellowshipMeetingId: string;
  memberId: string;
  isPresent: boolean;
  notes?: string;
  recordedBy: string;
  recordedAt: Date;
}

export interface OutreachProgram {
  id: string;
  branchId: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  coordinatorId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Soul {
  id: string;
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
  wonDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FollowUp {
  id: string;
  soulId: string;
  followUpDate: Date;
  followUpType: FollowUpType;
  notes?: string;
  nextFollowUpDate?: Date;
  followedUpBy: string;
  createdAt: Date;
}

export interface Event {
  id: string;
  branchId: string;
  name: string;
  description?: string;
  eventType: EventType;
  startDate: Date;
  endDate?: Date;
  location?: string;
  maxAttendees?: number;
  registrationRequired: boolean;
  registrationDeadline?: Date;
  cost?: number;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  memberId: string;
  registrationDate: Date;
  paymentStatus: PaymentStatus;
  amountPaid?: number;
  notes?: string;
  createdAt: Date;
}

export interface EventAttendance {
  id: string;
  eventId: string;
  memberId: string;
  attendanceDate: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  isPresent: boolean;
  notes?: string;
  recordedBy: string;
  recordedAt: Date;
}

export interface Payment {
  id: string;
  memberId: string;
  branchId: string;
  amount: number;
  currency: string;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  paymentDate: Date;
  description?: string;
  reference?: string;
  isRecurring: boolean;
  recurringFrequency?: RecurringFrequency;
  nextPaymentDate?: Date;
  status: PaymentStatus;
  processedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Pledge {
  id: string;
  memberId: string;
  branchId: string;
  amount: number;
  currency: string;
  pledgeType: PledgeType;
  startDate: Date;
  endDate?: Date;
  frequency: RecurringFrequency;
  description?: string;
  status: PledgeStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PledgePayment {
  id: string;
  pledgeId: string;
  paymentId: string;
  amount: number;
  paymentDate: Date;
  createdAt: Date;
}

export interface Form {
  id: string;
  branchId: string;
  name: string;
  description?: string;
  isActive: boolean;
  allowMultipleSubmissions: boolean;
  submissionDeadline?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormField {
  id: string;
  formId: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: FormFieldType;
  isRequired: boolean;
  options?: string[];
  validation?: string;
  order: number;
  createdAt: Date;
}

export interface FormSubmission {
  id: string;
  formId: string;
  memberId?: string;
  submissionDate: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface FormAnswer {
  id: string;
  formSubmissionId: string;
  formFieldId: string;
  answer: string;
  createdAt: Date;
}

export interface Announcement {
  id: string;
  branchId: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  targetAudience: string[];
  publishDate: Date;
  expiryDate?: Date;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  readAt?: Date;
  actionUrl?: string;
  createdAt: Date;
}

export interface MessageThread {
  id: string;
  branchId: string;
  subject: string;
  participants: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  messageThreadId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  attachments?: string[];
  isRead: boolean;
  readAt?: Date;
  sentAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface AccessLog {
  id: string;
  userId: string;
  action: AccessAction;
  resource: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
}

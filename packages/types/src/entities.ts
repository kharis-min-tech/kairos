// ── Entity interfaces ─────────────────────────────────────
// Match Drizzle schema column names (camelCase TS, snake_case SQL)

import type {
  BranchType,
  Gender,
  LeadershipRole,
  AttendanceStatus,
  FellowshipType,
  MemberApprovalStatus,
  SystemRole,
} from './enums';

// ── Base ───────────────────────────────────────────────────

interface BaseEntity {
  id: string; // UUID
  createdAt: Date;
  updatedAt: Date;
}

// ── Region ─────────────────────────────────────────────────

export interface Region extends BaseEntity {
  regionName: string;
  country: string;
}

// ── Branch ─────────────────────────────────────────────────

export interface ServiceSchedule {
  day: string;
  time: string;
  type: string;
}

export interface Branch extends BaseEntity {
  branchName: string;
  regionId: string;
  branchType: BranchType;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  establishedDate: string | null; // ISO date string
  isActive: boolean;
  serviceSchedule?: ServiceSchedule[];
}

export interface BranchWithRegion extends Branch {
  regionName: string;
}

// ── Member ─────────────────────────────────────────────────

export interface Member extends BaseEntity {
  firstName: string;
  lastName: string;
  middleName: string | null;
  dateOfBirth: string | null; // ISO date string
  gender: Gender | null;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  homeBranchId: string;
  secondaryBranchId: string | null;
  isAtSecondaryBranch: boolean;
  secondaryAddress: string | null;
  secondaryCity: string | null;
  secondaryPostalCode: string | null;
  membershipDate: string; // ISO date string
  isActive: boolean;
  photoUrl: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  approvalStatus: MemberApprovalStatus;
  systemRole: SystemRole;
  emailVerified: boolean;
  mustChangePassword: boolean;
}

export interface MemberWithBranch extends Member {
  branchName: string;
}

// ── Branch Leadership ──────────────────────────────────────

export interface BranchLeadership extends BaseEntity {
  branchId: string;
  memberId: string;
  role: LeadershipRole;
  startDate: string; // ISO date string
  endDate: string | null;
  isCurrent: boolean;
}

export interface BranchLeadershipWithMember extends BranchLeadership {
  memberFirstName: string;
  memberLastName: string;
  memberPhotoUrl?: string | null;
}

// ── Role ───────────────────────────────────────────────────

export interface Role extends BaseEntity {
  roleName: string;
  description: string | null;
  isActive: boolean;
}

// ── Member Role ────────────────────────────────────────────

export interface MemberRole extends BaseEntity {
  memberId: string;
  roleId: string;
  branchId: string;
  assignedDate: string; // ISO date string
  endDate: string | null;
  isActive: boolean;
  notes: string | null;
}

export interface MemberRoleWithDetails extends MemberRole {
  roleName: string;
  branchName: string;
}

// ── Fellowship ─────────────────────────────────────────────

export interface Fellowship extends BaseEntity {
  fellowshipName: string;
  branchId: string;
  fellowshipType: FellowshipType;
  description: string | null;
  leaderId: string | null;
  coLeaderId: string | null;
  meetingSchedule: string | null;
  isActive: boolean;
}

export interface FellowshipWithBranch extends Fellowship {
  branchName: string;
  leaderFirstName?: string | null;
  leaderLastName?: string | null;
}

// ── Fellowship Member ──────────────────────────────────────

export interface FellowshipMember extends BaseEntity {
  fellowshipId: string;
  memberId: string;
  joinDate: string; // ISO date string
  leaveDate: string | null;
  isActive: boolean;
  notes: string | null;
}

export interface FellowshipMemberWithDetails extends FellowshipMember {
  memberFirstName: string;
  memberLastName: string;
  memberPhotoUrl?: string | null;
}

// ── Fellowship Meeting ─────────────────────────────────────

export interface FellowshipMeeting extends BaseEntity {
  fellowshipId: string;
  meetingDate: Date;
  meetingTitle: string | null;
  meetingTopic: string | null;
  meetingNotes: string | null;
  location: string | null;
  durationMinutes: number | null;
  createdBy: string | null;
}

// ── Fellowship Meeting Attendance ──────────────────────────

export interface FellowshipMeetingAttendance {
  meetingId: string;
  memberId: string;
  attendanceStatus: AttendanceStatus;
  arrivalTime: Date | null;
  notes: string | null;
  recordedAt: Date;
  recordedBy: string | null;
}

// ── Fellowship Join Request ────────────────────────────────

export interface FellowshipJoinRequest extends BaseEntity {
  fellowshipId: string;
  memberId: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
}

export interface FellowshipJoinRequestWithMember extends FellowshipJoinRequest {
  memberFirstName: string;
  memberLastName: string;
  memberPhotoUrl?: string | null;
}

export interface NewBelieverEnrollment {
  id: string;
  memberId: string;
  branchId: string;
  teacherId?: string | null;
  stage: string;
  enrolledAt: string;
  completedAt?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewBelieverEnrollmentWithMember extends NewBelieverEnrollment {
  memberFirstName: string;
  memberLastName: string;
  teacherFirstName?: string | null;
  teacherLastName?: string | null;
}

export interface NewBelieverSession {
  id: string;
  branchId: string;
  teacherId?: string | null;
  teacherFirstName?: string | null;
  teacherLastName?: string | null;
  sessionDate: string;
  topic: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewBelieverAttendance {
  sessionId: string;
  enrollmentId: string;
  attended: boolean;
  notes?: string | null;
  recordedAt: string;
}

export interface NewBelieverAttendanceWithMember extends NewBelieverAttendance {
  memberFirstName: string;
  memberLastName: string;
}

// ── Department ─────────────────────────────────────────────

export interface Department {
  id: string;
  departmentName: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Service ───────────────────────────────────────────────

export interface Service {
  id: string;
  branchId: string;
  serviceDate: Date;
  serviceType: string;
  serviceTitle: string | null;
  preacherId: string | null;
  topic: string | null;
  notes: string | null;
  expectedAttendance: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Donation ──────────────────────────────────────────────

export interface Donation {
  id: string;
  memberId: string;
  branchId: string;
  donationDate: string;
  amount: number;
  currency: string;
  donationPurpose: string;
  description: string | null;
  paymentMethod: string | null;
  referenceNumber: string | null;
  isAnonymous: boolean;
  notes: string | null;
  recordedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Notification ──────────────────────────────────────────

export interface Notification {
  id: string;
  title: string;
  message: string;
  notificationType: string;
  priority: string;
  targetScope: string;
  targetBranchId: string | null;
  targetRegionId: string | null;
  targetDepartmentId: string | null;
  targetFellowshipId: string | null;
  targetRoleId: string | null;
  targetLeadershipRole: string | null;
  sentBy: string;
  sentAt: Date;
  scheduledFor: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Form ──────────────────────────────────────────────────

export interface Form {
  id: string;
  formType: string;
  branchId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Outreach Program ──────────────────────────────────────

export interface OutreachProgram {
  id: string;
  outreachId: string;
  branchId: string;
  programName: string;
  programDate: string;
  location: string;
  address: string | null;
  city: string | null;
  description: string | null;
  coordinatorId: string | null;
  totalSoulsReached: number;
  notes: string | null;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Soul ──────────────────────────────────────────────────

export interface Soul {
  id: string;
  soulId: string;
  outreachId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  gender: Gender | null;
  ageRange: string | null;
  assignedMemberId: string | null;
  convertedToMemberId: string | null;
  status: 'New' | 'Following Up' | 'Interested' | 'Not Interested' | 'Converted' | 'Lost Contact';
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Follow Up ─────────────────────────────────────────────

export interface FollowUp {
  id: string;
  followUpId: string;
  soulId: string;
  memberId: string;
  followUpDate: Date;
  contactMethod: string | null;
  contactStatus: string;
  durationMinutes: number | null;
  notes: string | null;
  nextFollowUpDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

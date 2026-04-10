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
  SoulStatus,
  ContactMethod,
  ContactStatus,
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

// ── Outreach Program ───────────────────────────────────────

export interface OutreachProgram extends BaseEntity {
  branchId: string;
  programName: string;
  programDate: string; // ISO date string
  location: string;
  address: string | null;
  city: string | null;
  description: string | null;
  coordinatorId: string | null;
  coordinatorName?: string | null;
  createdBy?: string | null;
  totalSoulsReached: number;
  notes: string | null;
  isCompleted: boolean;
  isOpenToAllBranches?: boolean;
}

export interface OutreachProgramWithDetails extends OutreachProgram {
  branchName: string;
  coordinatorFirstName?: string | null;
  coordinatorLastName?: string | null;
  createdByName?: string | null;
  // For members
  isRegistered?: boolean;
  // For leaders/pastors/admin
  participantCount?: number;
  totalMembers?: number;
}

// ── Soul ───────────────────────────────────────────────────

export interface Soul extends BaseEntity {
  outreachId: string | null;
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
  status: SoulStatus;
  notes: string | null;
}

export interface SoulWithDetails extends Soul {
  outreachProgramName?: string | null;
  assignedMemberFirstName?: string | null;
  assignedMemberLastName?: string | null;
  convertedMemberFirstName?: string | null;
  convertedMemberLastName?: string | null;
  daysSinceLastFollowUp?: number;
  isOverdue?: boolean;
}

// ── Follow Up ──────────────────────────────────────────────

export interface FollowUp extends BaseEntity {
  soulId: string;
  memberId: string;
  followUpDate: Date;
  contactMethod: ContactMethod | null;
  contactStatus: ContactStatus;
  durationMinutes: number | null;
  notes: string | null;
  nextFollowUpDate: string | null; // ISO date string
}

export interface FollowUpWithDetails extends FollowUp {
  memberFirstName: string;
  memberLastName: string;
  soulFirstName: string;
  soulLastName: string;
}

// ── Outreach Participant ───────────────────────────────────

export interface OutreachParticipant {
  outreachId: string;
  memberId: string;
  role: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface OutreachParticipantWithMember extends OutreachParticipant {
  memberFirstName: string;
  memberLastName: string;
  memberPhotoUrl?: string | null;
}

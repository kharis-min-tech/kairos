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
  membershipDate: string; // ISO date string
  isActive: boolean;
  photoUrl: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  approvalStatus: MemberApprovalStatus;
  systemRole: SystemRole;
  emailVerified: boolean;
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

// ── Fellowship Member ──────────────────────────────────────

export interface FellowshipMember extends BaseEntity {
  fellowshipId: string;
  memberId: string;
  joinDate: string; // ISO date string
  leaveDate: string | null;
  isActive: boolean;
  notes: string | null;
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

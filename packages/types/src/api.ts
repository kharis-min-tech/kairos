// ── API request/response types ─────────────────────────────

import type { SystemRole } from './enums';
import type { Member } from './entities';

// ── Auth ───────────────────────────────────────────────────

export interface SignupRequest {
  // Step 1: Personal info
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: string;
  gender?: 'Male' | 'Female';
  email: string;
  phone?: string;
  // Step 2: Emergency / Ministry
  address?: string;
  city?: string;
  postalCode?: string;
  homeBranchId: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  // Step 3: Password
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  tokens: AuthTokens;
  member: MemberProfile;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

// ── Auth Context (decoded JWT) ─────────────────────────────

export interface AuthContext {
  memberId: string;
  email: string;
  systemRole: SystemRole;
  branchId: string;
}

// ── Member Profile ─────────────────────────────────────────

export type MemberProfile = Omit<Member, 'createdAt' | 'updatedAt'>;

// ── Pagination ─────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── API Response ───────────────────────────────────────────

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  code?: string;
}

// ── Branch ─────────────────────────────────────────────────

export interface CreateBranchRequest {
  branchName: string;
  regionId: string;
  branchType?: 'Main' | 'Satellite' | 'Cell' | 'Campus' | 'Online';
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  establishedDate?: string;
}

export interface UpdateBranchRequest extends Partial<CreateBranchRequest> {}

// ── Member ─────────────────────────────────────────────────

export interface UpdateMemberRequest {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: string;
  gender?: 'Male' | 'Female';
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  photoUrl?: string;
}

export interface ApproveMemberRequest {
  approved: boolean;
}

export interface AssignRoleRequest {
  roleId: string;
  branchId: string;
  notes?: string;
}

export interface MemberListParams {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}

// ── Fellowship ─────────────────────────────────────────────

export interface CreateFellowshipRequest {
  fellowshipName: string;
  branchId: string;
  fellowshipType: string;
  description?: string;
  leaderId?: string;
  coLeaderId?: string;
  meetingSchedule?: string;
}

export interface UpdateFellowshipRequest extends Partial<CreateFellowshipRequest> {}

export interface FellowshipListParams {
  page?: number;
  limit?: number;
  fellowshipType?: string;
  branchId?: string;
}

export interface AddFellowshipMemberRequest {
  memberId: string;
  notes?: string;
}

// ── Fellowship Meeting ─────────────────────────────────────

export interface CreateFellowshipMeetingRequest {
  meetingDate: string;
  meetingTitle?: string;
  meetingTopic?: string;
  meetingNotes?: string;
  location?: string;
  durationMinutes?: number;
}

export interface RecordAttendanceRequest {
  meetingId: string;
  records: {
    memberId: string;
    attendanceStatus: 'Present' | 'Absent' | 'Excused' | 'Late';
    notes?: string;
  }[];
}

// ── Region ─────────────────────────────────────────────────

export interface CreateRegionRequest {
  regionName: string;
  country: string;
}

export interface UpdateRegionRequest extends Partial<CreateRegionRequest> {}

// ── Leadership ─────────────────────────────────────────────

export interface AssignLeadershipRequest {
  memberId: string;
  role: 'Main Pastor' | 'Elder';
  startDate?: string;
}

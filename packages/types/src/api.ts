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
  emergencyContactRelationship?: string;
  // Step 3: Password
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  activeRole?: SystemRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  tokens: AuthTokens;
  member: MemberProfile;
  isFirstLogin: boolean;
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
  activeRole?: SystemRole;
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
  serviceSchedule?: { day: string; time: string; type: string }[];
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
  secondaryBranchId?: string | null;
  secondaryAddress?: string;
  secondaryCity?: string;
  secondaryPostalCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  photoUrl?: string;
}

export interface SwitchActiveBranchResponse {
  tokens: AuthTokens;
  isAtSecondaryBranch: boolean;
  activeBranchId: string;
}

export interface ApproveMemberRequest {
  approved: boolean;
}

export interface AssignRoleRequest {
  roleId: string;
  branchId: string;
  notes?: string;
}

export interface CreateMemberRequest {
  firstName: string;
  lastName: string;
  email: string;
  homeBranchId: string;
  phone?: string;
  gender?: 'Male' | 'Female';
  dateOfBirth?: string;
  middleName?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  secondaryBranchId?: string | null;
  secondaryAddress?: string;
  secondaryCity?: string;
  secondaryPostalCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  systemRole?: SystemRole;
}

export interface CreateMemberResponse {
  member: MemberProfile;
  generatedPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export type MemberStatsResponse = MemberDashboardStats;

export interface MemberListParams {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  fellowshipId?: string;
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
  memberId?: string;
}

export interface AddFellowshipMemberRequest {
  memberId: string;
  notes?: string;
}

export interface CreateJoinRequestRequest {
  notes?: string;
}

export interface ReviewJoinRequestRequest {
  status: 'approved' | 'rejected';
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
  records: {
    memberId: string;
    attendanceStatus: 'Present' | 'Absent' | 'Excused' | 'Late';
    notes?: string;
  }[];
}

// ── Fellowship Followups ───────────────────────────────────

export interface ListFellowshipFollowupsParams {
  limit?: number;
  days?: number;
  memberId?: string;
}

export interface CreateFellowshipFollowupRequest {
  contactedAt?: string;
  contactMethod: string;
  contactStatus: string;
  durationMinutes?: number | null;
  notes?: string | null;
  nextFollowUpDate?: string | null;
  assignedToId?: string | null;
}

export interface UpdateFellowshipFollowupRequest extends Partial<CreateFellowshipFollowupRequest> {}

// ── Region ─────────────────────────────────────────────────

export interface CreateRegionRequest {
  regionName: string;
  country: string;
}

export interface UpdateRegionRequest extends Partial<CreateRegionRequest> {}

// ── Leadership ─────────────────────────────────────────────

export interface GetLeadershipParams {
  includeHistory?: boolean;
}

export interface AssignLeadershipRequest {
  memberId: string;
  role: 'Main Pastor' | 'Elder';
  startDate?: string;
}

// ── Dashboard / Analytics ──────────────────────────────────

export interface AdminDashboardStats {
  totalBranches: number;
  totalMembers: number;
  totalFellowships: number;
  membersByApproval: { status: string; count: number }[];
  fellowshipsByType: { type: string; count: number }[];
}

export interface BranchDashboardStats {
  totalMembers: number;
  totalFellowships: number;
  recentMeetings: number;
  pendingApprovals: number;
  attendanceTrend: { week: string; rate: number }[];
}

export interface MemberDashboardStats {
  fellowshipsJoined: number;
  fellowships: {
    fellowshipId: string;
    fellowshipName: string;
    fellowshipType: string;
  }[];
  recentAttendance: {
    total: number;
    present: number;
    rate: number;
  };
}

// ── Reports ────────────────────────────────────────────────

export interface ReportsMemberGrowth {
  month: string;
  newSignups: number;
}

export interface ReportsAttendanceTrend {
  week: string;
  rate: number;
}

export interface ReportsFellowshipActivity {
  fellowshipName: string;
  meetingCount: number;
  avgAttendees: number;
}

// ── Outreach / Evangelism ──────────────────────────────────

export interface CreateProgramRequest {
  branchId?: string; // Required for Admin, auto-set for Pastor
  programName: string;
  programDate: string; // ISO date
  location: string;
  address?: string;
  city?: string;
  description?: string;
  coordinatorId?: string;
}

export interface UpdateProgramRequest {
  programName?: string;
  location?: string;
  address?: string;
  city?: string;
  description?: string;
  coordinatorId?: string;
  notes?: string;
  isCompleted?: boolean;
}

export interface ListProgramsParams {
  page?: number;
  limit?: number;
  isCompleted?: 'true' | 'false' | 'all';
  dateFrom?: string;
  dateTo?: string;
  coordinatorId?: string;
  search?: string;
}

export interface RegisterWorkerRequest {
  memberId?: string; // Optional, defaults to current user
  role?: string;
  notes?: string;
}

export interface CaptureSoulRequest {
  outreachId?: string; // Optional for ad-hoc
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  gender?: 'Male' | 'Female';
  ageRange?: string;
  notes?: string;
}

export interface UpdateSoulStatusRequest {
  status: 'New' | 'Following Up' | 'Interested' | 'Not Interested' | 'Converted' | 'Lost Contact';
  convertedToMemberId?: string; // Required if status='Converted'
}

export interface ReassignSoulRequest {
  assignedMemberId: string;
}

export interface LogFollowUpRequest {
  contactMethod?: 'Phone Call' | 'Text Message' | 'Email' | 'WhatsApp' | 'In-Person Visit' | 'Other';
  contactStatus: 'Successful' | 'No Answer' | 'Wrong Number' | 'Call Back Later' | 'Not Interested' | 'Interested';
  durationMinutes?: number;
  notes?: string;
  nextFollowUpDate?: string; // ISO date
}

export interface ListSoulsParams {
  page?: number;
  limit?: number;
  status?: 'New' | 'Following Up' | 'Interested' | 'Not Interested' | 'Converted' | 'Lost Contact';
  assignedMemberId?: string;
  outreachId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  overdueOnly?: 'true' | 'false';
}

export interface ConversionResult {
  soul: import('./entities').Soul;
  member: import('./entities').Member;
}

export interface ProgramStatistics {
  totalWorkers: number;
  totalSouls: number;
  statusDistribution: Record<string, number>;
  averageFollowUpsPerSoul: number;
  conversionRate: number;
  averageDaysToConversion: number;
}

export interface FollowUpStatistics {
  totalFollowUps: number;
  lastFollowUpDate?: string;
  daysSinceLastFollowUp: number;
  averageDuration: number;
}

// ── New Believers ────────────────────────────────────────
export interface CreateEnrollmentRequest {
  memberId: string;
  branchId: string;
  teacherId?: string;
  mentorId?: string;
  notes?: string;
}

export interface UpdateEnrollmentRequest {
  stage?: string;
  teacherId?: string | null;
  mentorId?: string | null;
  notes?: string | null;
  completedAt?: string | null;
  isActive?: boolean;
  sessionCompletedAt?: Record<string, string> | null;
  sessionFeedback?: Record<string, string> | null;
  joinedDepartmentId?: string | null;
}

export interface EnrollmentListParams {
  branchId?: string;
  stage?: string;
  teacherId?: string;
  stale?: boolean;
  sortBy?: 'date-added' | 'name' | 'last-activity';
  page?: number;
  limit?: number;
}

export interface BulkAdvanceEnrollmentsRequest {
  enrollmentIds: string[];
  targetStage: string;
}

export interface BulkAdvanceEnrollmentsResult {
  advanced: number;
  failed: number;
}

export interface CreateNewBelieverSessionRequest {
  branchId: string;
  sessionStage: string;
  sessionDate: string;
  topic?: string;
  location: string;
  teacherId: string;
  notes?: string;
  feedback?: string;
}

export interface UpdateNewBelieverSessionRequest {
  sessionStage?: string;
  topic?: string;
  sessionDate?: string;
  location?: string | null;
  notes?: string;
  feedback?: string;
  teacherId?: string | null;
}

export interface RecordNewBelieverAttendanceRequest {
  records: { enrollmentId: string; attended: boolean; notes?: string }[];
}

export interface SessionListParams {
  branchId?: string;
  upcoming?: boolean;
}

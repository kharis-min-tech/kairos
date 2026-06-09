// ── API request/response types ─────────────────────────────

import type {
  SystemRole,
  FormType,
  FormSubmissionStatus,
  MemberType,
  ServiceType,
  ServiceAttendanceStatus,
} from './enums';
import type {
  Member,
  MemberWithBranch,
  MemberHealthRecord,
  FormSubmission,
  FormSubmissionPayload,
} from './entities';

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

// ── Minor data protection ──────────────────────────────────
// Members surfaced through the list/detail read paths carry two extra flags so
// the web layer can render a redacted state. When a member is a protected minor
// and the viewer lacks safeguarding access, the sensitive fields below are set
// to null and `redacted` is true. Non-minor members always have
// `isMinor: false, redacted: false` and are returned unchanged.

/** Fields that get nulled out when a minor record is redacted. */
export type RedactableMemberField =
  | 'dateOfBirth'
  | 'email'
  | 'phone'
  | 'address'
  | 'city'
  | 'postalCode'
  | 'emergencyContactName'
  | 'emergencyContactPhone'
  | 'emergencyContactRelationship';

/** Minor-protection flags threaded onto every member read response. */
export interface MinorProtectionFlags {
  isMinor: boolean;
  redacted: boolean;
}

/** A member list row (with branch name) carrying minor-protection flags. */
export type MemberWithBranchProtected = MemberWithBranch & MinorProtectionFlags;

/** A member detail object carrying minor-protection flags. */
export type MemberDetailProtected = MemberWithBranch & MinorProtectionFlags;

// ── Member Health Record ───────────────────────────────────
// Upsert payload for the 1:1 health record. All fields optional/nullable —
// branchId is derived server-side from the member's homeBranchId and consent
// stamping (consentRecordedBy/consentDate) happens server-side.

export interface UpsertHealthRecordRequest {
  medicalConditions?: string | null;
  allergies?: string | null;
  medications?: string | null;
  dietaryNeeds?: string | null;
  additionalNotes?: string | null;
  photoMediaConsent?: boolean | null;
  medicalTreatmentConsent?: boolean | null;
  dataProcessingConsent?: boolean | null;
}

export type HealthRecordResponse = MemberHealthRecord | null;

// ── Safeguarding review ────────────────────────────────────
// An active minor whose guardian link is missing ('none') or points at a
// deactivated member ('inactive') — surfaced for safeguarding follow-up.

export interface UnguardedMinor {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  branchName: string;
  guardianStatus: 'none' | 'inactive';
  guardianName: string | null;
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
  meetingDay?: string;
  meetingTime?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
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
  branchCount: number;
  branches: {
    branchId: string;
    branchName: string;
    isHome: boolean;
  }[];
  recentAttendance: {
    total: number;
    present: number;
    late: number;
    absent: number;
    rate: number;
  };
}

export interface FellowshipDashboardStats {
  totalBranches: number;
  totalMembers: number;
  totalFellowships: number;
  attendanceRate: number;
  attendanceBreakdown: {
    present: number;
    late: number;
    absent: number;
    excused: number;
    total: number;
  };
  engagement: 'High' | 'Medium' | 'Low';
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
  fellowshipId?: string | null;
  branchDepartmentId?: string | null;
}

export interface UpdateProgramRequest {
  programName?: string;
  location?: string;
  address?: string;
  city?: string;
  description?: string;
  coordinatorId?: string;
  fellowshipId?: string | null;
  branchDepartmentId?: string | null;
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
  fellowshipId?: string | null;
  branchDepartmentId?: string | null;
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
  branchId?: string;
  fellowshipId?: string;
  branchDepartmentId?: string;
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
  mentorId?: string;
  stale?: boolean;
  sortBy?: 'date-added' | 'name' | 'last-activity';
  page?: number;
  limit?: number;
}

export interface MentorFollowupItem {
  id: string;
  enrollmentId: string;
  mentorMemberId: string;
  note: string;
  contactedAt: string;
  createdBy: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  mentorFirstName: string | null;
  mentorLastName: string | null;
}

export interface CreateMentorFollowupRequest {
  note: string;
  contactedAt?: string;
}

export interface NewBelieverHats {
  isNbLeader: boolean;
  hasTeacherRole: boolean;
  taughtEnrollmentIds: string[];
  mentoredEnrollmentIds: string[];
  ownEnrollmentIds: string[];
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

// ── Forms & Data Capture ───────────────────────────────────

export interface SubmitFormRequest {
  /** Set when the altar-call UI search-and-select picked an existing member/prospect. */
  subjectMemberId?: string;
  /** Ignored by the server — branch is forced to auth.branchId. */
  branchId?: string;
  payload: FormSubmissionPayload | Record<string, unknown>;
}

export interface FormMemberSearchParams {
  q: string;
  branchId?: string;
}

export interface FormMemberSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  memberType: MemberType;
}

export interface ListFormSubmissionsParams {
  branchId?: string;
  formType?: FormType;
  status?: FormSubmissionStatus;
  from?: string;
  to?: string;
}

export interface UpdateFormSubmissionRequest {
  status?: FormSubmissionStatus;
  notes?: string | null;
}

export interface ExportFormSubmissionsParams {
  branchId?: string;
  formType: FormType;
  status?: FormSubmissionStatus;
  from?: string;
  to?: string;
}

export interface DormantProspect {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  createdAt: string;
  hasEnrollment: boolean;
}

export interface ListDormantProspectsParams {
  branchId?: string;
}

export interface ArchiveProspectsRequest {
  memberIds: string[];
}

export interface ArchiveProspectsResult {
  archived: number;
}

// ── Attendance (services) ──────────────────────────────────

export interface CreateServiceRequest {
  branchId?: string;
  serviceDate: string; // ISO datetime
  serviceType: ServiceType;
  serviceTitle?: string;
  topic?: string;
  preacherId?: string;
  expectedAttendance?: number;
}

export type UpdateServiceRequest = Partial<CreateServiceRequest>;

export interface ServiceListParams {
  page?: number;
  limit?: number;
  branchId?: string;
  type?: ServiceType;
  dateFrom?: string;
  dateTo?: string;
}

export interface ServiceSummary {
  id: string;
  branchId: string;
  branchName: string | null;
  serviceDate: string;
  serviceType: ServiceType;
  serviceTitle: string | null;
  topic: string | null;
  preacherId: string | null;
  expectedAttendance: number | null;
  createdBy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceWithDetail extends ServiceSummary {
  preacherName: string | null;
  recordedCount: number;
}

export interface RosterParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface RosterEntry {
  memberId: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  status: ServiceAttendanceStatus | null;
}

export interface RecordAttendanceExistingEntry {
  memberId: string;
  status: ServiceAttendanceStatus;
  arrivalTime?: string;
}

export interface RecordAttendanceVisitorEntry {
  visitor: { firstName: string; lastName: string; phone?: string };
  status: ServiceAttendanceStatus;
  arrivalTime?: string;
}

export type RecordAttendanceEntry =
  | RecordAttendanceExistingEntry
  | RecordAttendanceVisitorEntry;

export interface RecordServiceAttendanceRequest {
  entries: RecordAttendanceEntry[];
}

export interface RecordAttendanceResult {
  recorded: number;
}

export interface ServiceAttendanceRow {
  serviceId: string;
  memberId: string;
  memberFirstName: string;
  memberLastName: string;
  attendanceStatus: ServiceAttendanceStatus;
  arrivalTime: string | null;
  isFirstTimeVisitor: boolean;
  recordedBy: string;
  recordedAt: string;
}

export interface AttendanceTrendPoint {
  weekStart: string;
  attendees: number;
  serviceCount: number;
}

export interface AttendanceTrendsParams {
  branchId?: string;
  weeks?: number;
}

export interface MissingMember {
  memberId: string;
  firstName: string;
  lastName: string;
  servicesConsidered: number;
}

export interface MissingMembersParams {
  branchId?: string;
  services?: number;
}

export interface BranchAttendanceRate {
  branchId: string;
  branchName: string;
  activeMembers: number;
  distinctAttendees: number;
  attendanceRate: number;
}

export interface BranchAttendanceParams {
  branchId?: string;
  weeks?: number;
}

// Dashboard summary feeding the Mission Control donuts: present/late/virtual
// status split + distinct-attendees ÷ active-members rate.
export interface AttendanceSummary {
  statusBreakdown: {
    present: number;
    late: number;
    virtual: number;
    total: number;
  };
  rate: {
    distinctAttendees: number;
    activeMembers: number;
    rate: number;
  };
}

export interface AttendanceSummaryParams {
  branchId?: string;
  weeks?: number;
}

export interface CohortDiffRequest {
  presentInServiceIds: string[];
  absentFromServiceIds: string[];
  presentMode: 'any' | 'all';
  absentMode: 'any' | 'all';
  branchId?: string;
}

export interface CohortDiffMember {
  memberId: string;
  firstName: string;
  lastName: string;
}

export interface CohortDiffResult {
  members: CohortDiffMember[];
}

// Department attendance breakdown (Phase 4a).
export interface DepartmentAttendanceMember {
  memberId: string;
  firstName: string;
  lastName: string;
  attendedCount: number;
  lateCount: number;
  totalServices: number;
  rate: number;
  lastAttendedAt: string | null;
}

export interface DepartmentAttendanceReport {
  department: { id: string; name: string; branchName: string };
  windowWeeks: number;
  totalServices: number;
  distinctAttendees: number;
  activeMembers: number;
  rate: number;
  members: DepartmentAttendanceMember[];
  trend: Array<{ weekStart: string; attendees: number }>;
}

// Member personal attendance snapshot — drives /me/attendance + dashboard card.
export interface MyAttendanceSnapshot {
  windowWeeks: number;
  servicesInWindow: number;
  attendedCount: number;
  rate: number; // 0..1
  presentOnTimeCount: number;
  lateCount: number;
  virtualCount: number;
  missedCount: number;
  currentStreak: { kind: 'attended' | 'missed'; length: number };
  lastAttendedAt: string | null;
  lastService: { id: string; serviceDate: string; serviceType: string; serviceTitle: string | null } | null;
  history: Array<{ serviceId: string; serviceDate: string; serviceType: string; status: string | null }>;
}

export type { FormSubmission };

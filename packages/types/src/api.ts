// ── API request/response types ─────────────────────────────

import type { Grant } from './rbac';
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
  // Signup-time acceptance of the current Terms & Conditions and Privacy
  // Notice. Records a consent row per policy at the current published version.
  acceptedPolicies: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface DeleteAccountRequest {
  currentPassword: string;
}

// The export endpoint returns a large, mixed-shape blob intended for download.
// Kept unknown/loose so schema changes in the underlying tables don't force
// this type to churn.
export type MyDataExport = Record<string, unknown> & { exportedAt: string };

// RoleScope narrows authority to a specific entity. Stamped into the JWT
// alongside each grant; the client decodes it for UI affordances.
export type RoleScope =
  | { kind: 'branch'; id: string }
  | { kind: 'fellowship'; id: string }
  | { kind: 'department'; id: string };

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

// ── OAuth (Better-Auth Phase 1) ────────────────────────────

export type OAuthProviderId = 'google' | 'microsoft' | 'apple';

export interface OAuthConnection {
  provider: OAuthProviderId;
  /** Provider-side email at link time. May be null for Apple hide-my-email. */
  providerEmail: string | null;
  connectedAt: string;
  lastUsedAt: string | null;
}

export interface OAuthConfirmLinkRequest {
  confirmationToken: string;
  password: string;
}

/**
 * Phase 1.5 SSO onboarding — the caller (an SSO-signup member with
 * `mustCompleteProfile === true`) submits the missing profile fields so the
 * server can flip the flag and route them to /pending-approval.
 *
 * `phone` + `homeBranchId` are required; `acceptedPolicies` is required only
 * if the user has not already accepted the current published Terms + Privacy
 * version. Every other field is surfaced on the onboarding form as OPTIONAL —
 * users are far more likely to fill them at first sign-in than to come back
 * later from the profile edit page, so we take what they give us and save it.
 */
export interface CompleteOAuthProfileRequest {
  phone: string;
  homeBranchId: string;
  acceptedPolicies?: boolean;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  gender?: 'Male' | 'Female';
  dateOfBirth?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
}

// ── Auth Context (decoded JWT) ─────────────────────────────

export interface AuthContext {
  memberId: string;
  email: string;
  systemRole: SystemRole;
  branchId: string;
  activeRole?: SystemRole;
  /**
   * Optional scope tying the chosen activeRole to a specific entity. Encoded
   * in the access-token JWT at login/finalize-role/switch-role. Phase 4 will
   * use this to narrow the authority of branch-scoped admins, fellowship
   * leaders and department leads. Absent on legacy tokens.
   */
  scope?: RoleScope;
  /**
   * Branch IDs where the caller holds the Branch System Admin role (via
   * `member_roles` JOIN `roles` WHERE roleName = 'Branch System Admin').
   * Populated at login/refresh. System admins get `[]` — their authority flows
   * from `systemRole === 'admin'`, not this list. Required at the type level:
   * legacy tokens that lack the field are normalised to `[]` by the auth
   * middleware so consumers don't have to defend against `undefined`.
   */
  branchSystemAdminBranchIds: string[];
  /**
   * Branch IDs where the caller holds Branch Data Admin authority (derived
   * from `branch_departments` for the 'Admin' global department where the
   * caller is the lead or deputy). Populated at login/refresh. Legacy tokens
   * are normalised to `[]` by the auth middleware.
   */
  branchDataAdminBranchIds: string[];
  /**
   * Functional role grants (Phase 1 of the RBAC rebuild). Each entry pairs a
   * named role bundle (FellowshipLeader, BranchAdmin, ...) with the scoped
   * entity it applies to. Computed at JWT-validation time by
   * `authMiddleware` via `resolveGrants(db, memberId)`. Old tokens that
   * predate this field are normalised to `[]` so consumers don't have to
   * defend against `undefined`.
   *
   * Until Phase 2 swaps gates over, this field coexists with the legacy
   * `systemRole` / `requireRole(...)` checks and changes no behavior.
   */
  grants: Grant[];
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
  latitude?: number | null;
  longitude?: number | null;
  phone?: string;
  email?: string;
  establishedDate?: string;
  serviceSchedule?: { day: string; time: string; type: string }[];
  selfCheckInEnabled?: boolean;
  selfCheckInOpenMinutesBefore?: number;
  selfCheckInCloseMinutesAfter?: number;
  selfCheckInLateAfterMinutes?: number;
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
  /**
   * Narrow to a single member type. Omit to show Members + Attendees (the
   * default post-approval view). Visitor/child shells never appear here
   * regardless — they have dedicated surfaces.
   */
  memberType?: 'member' | 'attendee';
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

// Task #4 Phase B: minor surfaced for SG-Lead review (dormant child shell).
export interface DormantMinor {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  createdAt: string;
  lastReviewedAt: string | null;
  lastDecision: 'active' | 'archived' | null;
  lastReviewerName: string | null;
}

export interface ReviewMinorRequest {
  decision: 'active' | 'archived';
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
  address?: string;
  city?: string;
  postalCode?: string;
  latitude?: number | null;
  longitude?: number | null;
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
  // Visit-shape (0046). New rows should always set `type`; when omitted the
  // server infers 'contact' to keep old clients working.
  type?: 'contact' | 'visit';
  methods?: (
    | 'phone_call'
    | 'text_message'
    | 'whatsapp'
    | 'email'
    | 'in_person'
    | 'virtual'
    | 'other'
  )[];
  contactReached?: boolean;
  interestLevel?: 'interested' | 'not_interested' | 'undecided';
  visitKind?: 'in_person' | 'virtual';
  visitAnnounced?: boolean;
  visitArrivalAt?: string;
  visitDepartureAt?: string;
  visitOutcome?: 'present' | 'not_present' | 'rescheduled';
  companionMemberIds?: string[];
  welfareConcern?: boolean;
  safeguardingConcern?: boolean;
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

/**
 * Task #33 Phase 2 follow-up: the four real categories the church tracks.
 * Sums to MemberRollBreakdown's parent totalRoll.
 *  - members:   completed the 4-week membership class
 *  - returners: attend regularly, no class yet (memberType='attendee')
 *  - visitors:  occasional attenders (memberType='visitor')
 *  - children:  under-16 (memberType='child')
 */
export interface MemberRollBreakdown {
  members: number;
  returners: number;
  visitors: number;
  children: number;
}

export interface AdminDashboardStats {
  totalBranches: number;
  /** Total active people on the church roll (sum of memberBreakdown). */
  totalRoll: number;
  memberBreakdown: MemberRollBreakdown;
  /** @deprecated read memberBreakdown.members. Kept for back-compat. */
  totalMembers: number;
  totalFellowships: number;
  /**
   * Count of members awaiting admin review. Includes self-signup users
   * (inactive until approved) and non-real-member shells — matches what
   * the /members?approvalStatus=pending list surfaces.
   */
  pendingApprovals: number;
  membersByApproval: { status: string; count: number }[];
  fellowshipsByType: { type: string; count: number }[];
}

export interface BranchDashboardStats {
  /** Total active people in this branch (sum of memberBreakdown). */
  totalRoll: number;
  memberBreakdown: MemberRollBreakdown;
  /** @deprecated read memberBreakdown.members. Kept for back-compat. */
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
  /** Total active people in scope (sum of memberBreakdown). */
  totalRoll: number;
  memberBreakdown: MemberRollBreakdown;
  /** @deprecated read memberBreakdown.members. Kept for back-compat. */
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

export const NB_REMOVAL_REASONS = [
  'awol',
  'withdrew',
  'moved_away',
  'stopped_attending',
  'other',
] as const;
export type NBRemovalReason = (typeof NB_REMOVAL_REASONS)[number];

export const NB_REMOVAL_REASON_LABEL: Record<NBRemovalReason, string> = {
  awol: 'Went AWOL',
  withdrew: 'Withdrew',
  moved_away: 'Moved away',
  stopped_attending: 'Stopped attending',
  other: 'Other',
};

export interface RemoveEnrollmentRequest {
  reason: NBRemovalReason;
  notes?: string;
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
  /** Set when the altar-call UI search-and-select picked an existing member/attendee. */
  subjectMemberId?: string;
  /** Ignored by the server — branch is forced to auth.branchId. */
  branchId?: string;
  payload: FormSubmissionPayload | Record<string, unknown>;
  /**
   * GDPR / safeguarding consent — REQUIRED in production. Marked optional on the
   * TypeScript type so existing unit tests that don't construct consent envelopes
   * keep compiling; the Zod schema (submitFormSchema) enforces presence at the
   * route boundary.
   */
  consentGivenAt?: string;
  consentPolicyVersion?: string;
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

export interface DormantAttendee {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  createdAt: string;
  hasEnrollment: boolean;
}

export interface ListDormantAttendeesParams {
  branchId?: string;
}

export interface ArchiveAttendeesRequest {
  memberIds: string[];
}

export interface ArchiveAttendeesResult {
  archived: number;
}

/** #4 Phase A: dormant visitor — no enrollment field because visitors don't
 *  enter the New Believers pipeline by default. */
export interface DormantVisitor {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  createdAt: string;
}

export interface ListDormantVisitorsParams {
  branchId?: string;
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
  /**
   * Task #33 follow-up: per-service category breakdown of who was recorded
   * present. The four counts always sum to recordedCount.
   */
  categoryBreakdown: MemberRollBreakdown;
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

// ── Self check-in ─────────────────────────────────────────

export interface SelfCheckInResult {
  serviceId: string;
  memberId: string;
  status: 'Present' | 'Late';
  arrivalTime: string;
  alreadyCheckedIn: boolean;
}

/**
 * Rotating QR token returned to admin-desk clients. Polled every ~30s.
 * Client encodes the QR as `kairos://check-in/{serviceId}/{token}`.
 */
export interface QrTokenPayload {
  token: string;
  /** ms epoch when the current bucket ends — client should re-poll before then. */
  expiresAt: number;
  serviceId: string;
}

/** Body posted by the member scanner to the verify endpoint. */
export interface SelfCheckInQrRequest {
  token: string;
}

/** Per-service check-in candidate the mobile Check-in tab renders. */
export interface SelfCheckInCandidate {
  serviceId: string;
  serviceDate: string;
  serviceType: string;
  serviceTitle: string | null;
  windowOpensAt: string;
  windowClosesAt: string;
  lateAfterAt: string;
  /** `open` = tap to check in. `opens-soon` = show countdown. `closed` = past the window. */
  status: 'open' | 'opens-soon' | 'closed';
  minutesUntilOpen: number | null;
}

export interface AttendanceTrendPoint {
  weekStart: string;
  /** Attendee-weeks: each attendee counted once per week they showed up. */
  attendees: number;
  /**
   * Distinct members who attended at least one service in this week.
   * Overlaid on the weekly line to separate same-regulars (line runs flat
   * even as `attendees` climbs) from real growth (this line climbs too).
   */
  distinctAttendees: number;
  serviceCount: number;
}

export interface AttendanceTrendsParams {
  branchId?: string;
  weeks?: number;
  departmentId?: string;
  fellowshipId?: string;
}

export interface MissingMember {
  memberId: string;
  firstName: string;
  lastName: string;
  /** Total services in the window used to compute the streak. */
  servicesConsidered: number;
  /**
   * Consecutive most-recent services this member missed. Always ≥ 1 for
   * members on this list (streak-of-0 = present at the last service = not
   * missing). Sort descending to surface the most disengaged first.
   */
  missedStreak: number;
}

export interface MissingMembersParams {
  branchId?: string;
  services?: number;
  departmentId?: string;
  fellowshipId?: string;
}

export interface BranchAttendanceRate {
  branchId: string;
  branchName: string;
  /** All active members on the roll (soft-delete denominator). */
  activeMembers: number;
  /**
   * Members who attended at least one service in the engagement window
   * (default 3 months). This is the honest denominator for pastoral rates —
   * people who stopped coming a year ago still sit in `activeMembers` because
   * nobody flipped their soft-delete flag.
   */
  engagedMembers: number;
  distinctAttendees: number;
  /** distinctAttendees ÷ engagedMembers, capped at 1.0. */
  attendanceRate: number;
}

export interface BranchAttendanceParams {
  branchId?: string;
  weeks?: number;
  /**
   * Engagement window in months for the `engagedMembers` denominator.
   * User-configurable via the report page dropdown; default 3.
   */
  engagedWindowMonths?: number;
}

// ── Attendance heatmap (headline v2 visual) ────────────────
// Rows = members in scope, columns = last N services on the branch.
// Cells encode attendance status per service or "absent" if no row exists.

export type AttendanceHeatmapCellStatus = 'present' | 'late' | 'virtual' | 'absent';

export interface AttendanceHeatmapService {
  id: string;
  serviceDate: string;
  serviceType: string;
  serviceTitle: string | null;
}

export interface AttendanceHeatmapMember {
  memberId: string;
  firstName: string;
  lastName: string;
  /** Cell status per service, in the same order as the top-level services array. */
  cells: AttendanceHeatmapCellStatus[];
  /** Services attended (Present/Late/Virtual all count) in the window. */
  attendedCount: number;
  /** Distinct services in the window (denominator for attendancePct). */
  servicesConsidered: number;
  /** attendedCount / servicesConsidered, rounded to 3dp; 0 when window empty. */
  attendancePct: number;
  /** Leading consecutive-absence count from the most recent service. */
  missedStreak: number;
}

export interface AttendanceHeatmap {
  services: AttendanceHeatmapService[];
  members: AttendanceHeatmapMember[];
}

export interface AttendanceHeatmapParams {
  branchId: string;
  weeks?: number;
  departmentId?: string;
  fellowshipId?: string;
  engagedWindowMonths?: number;
  /** When true, filter to members who attended at least once in the engagement window. */
  engagedOnly?: boolean;
}

// ── Frequency buckets ──────────────────────────────────────
// How often engaged members show up. Weekly / biweekly / monthly / occasional /
// dormant — thresholds computed over the engagement window.

export type FrequencyBucketKey =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'occasional'
  | 'dormant';

export interface FrequencyBucket {
  key: FrequencyBucketKey;
  label: string;
  /** How many engaged members fall into this bucket. */
  members: number;
  /**
   * Human-readable rule used to place a member in this bucket, e.g.
   * "attended ≥75% of services in the window".
   */
  description: string;
}

export interface FrequencyBucketReport {
  windowMonths: number;
  servicesConsidered: number;
  engagedMembers: number;
  buckets: FrequencyBucket[];
}

export interface FrequencyBucketParams {
  branchId?: string;
  engagedWindowMonths?: number;
  departmentId?: string;
  fellowshipId?: string;
}

// ── First-time vs returning per week ───────────────────────

export interface FirstTimeReturningPoint {
  weekStart: string;
  /** Members whose earliest attendance record falls in this week. */
  firstTime: number;
  /** Members who had attended before this week. */
  returning: number;
}

export interface FirstTimeReturningParams {
  branchId?: string;
  weeks?: number;
  departmentId?: string;
  fellowshipId?: string;
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
  departmentId?: string;
  fellowshipId?: string;
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

// Fellowship attendance combined report (Phase 4b).
export interface FellowshipAttendanceMember {
  memberId: string;
  firstName: string;
  lastName: string;
  serviceAttendedCount: number;
  serviceRate: number;
  meetingAttendedCount: number;
  meetingRate: number;
}

export interface FellowshipAttendanceReport {
  fellowship: { id: string; name: string; branchName: string };
  windowWeeks: number;
  activeMembers: number;
  services: {
    totalServices: number;
    distinctAttendees: number;
    rate: number;
    trend: Array<{ weekStart: string; attendees: number }>;
  };
  meetings: {
    totalMeetings: number;
    distinctAttendees: number;
    rate: number;
    lastMeeting: { id: string; date: string; attended: number; total: number } | null;
  };
  members: FellowshipAttendanceMember[];
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

// Forms caller capabilities — drives /forms landing + /forms/submissions filter gating.
export interface FormsCapabilities {
  visibleFormTypes: FormType[];
  canSeeAttendees: boolean;
}

// ── /api/me/leadership — caller's leadership footprint ────────
// Echoes the branch-admin authority lists from AuthContext and adds the
// fellowship/department entities the caller leads or co-leads, so the web
// layer can render "what I'm responsible for" at a glance.

export interface MeLeadershipFellowship {
  id: string;
  fellowshipName: string;
  branchId: string;
}

export interface MeLeadershipDepartment {
  id: string;
  departmentName: string;
  branchId: string;
}

export interface MeLeadershipResponse {
  branchSystemAdminBranchIds: string[];
  branchDataAdminBranchIds: string[];
  leadFellowships: MeLeadershipFellowship[];
  coLeadFellowships: MeLeadershipFellowship[];
  leadDepartments: MeLeadershipDepartment[];
  deputyDepartments: MeLeadershipDepartment[];
}

// ── Unified inbox — approvals + follow-ups ────────────────
//
// Cross-domain feeds that walk the caller's scope grants and roll up every
// pending decision (approvals) or open task (follow-ups) into a single list
// the mobile app can render behind /approvals and /follow-ups. Every row
// discriminates on `kind` so callers can render + route per type.

export type MeApprovalItem =
  | {
      kind: 'member_signup';
      id: string;
      subjectMemberId: string;
      subjectName: string;
      branchName: string | null;
      createdAt: string;
    }
  | {
      kind: 'fellowship_join';
      id: string;
      subjectMemberId: string;
      subjectName: string;
      fellowshipId: string;
      fellowshipName: string;
      createdAt: string;
    }
  | {
      kind: 'department_join';
      id: string;
      subjectMemberId: string;
      subjectName: string;
      branchDeptId: string;
      departmentName: string;
      status: string;
      createdAt: string;
    };

export type MeFollowupItem =
  | {
      kind: 'soul';
      id: string;
      subjectName: string;
      status: string;
      createdAt: string;
    }
  | {
      kind: 'fellowship_followup';
      id: string;
      memberId: string;
      subjectName: string;
      fellowshipId: string;
      fellowshipName: string;
      nextFollowUpDate: string;
      notes: string | null;
    }
  | {
      kind: 'department_followup';
      id: string;
      memberId: string;
      subjectName: string;
      branchDeptId: string;
      departmentName: string;
      nextFollowUpDate: string;
      notes: string | null;
    }
  | {
      kind: 'mentor_enrollment';
      /** Enrollment id — mentors are surfaced per enrollment, not per note. */
      id: string;
      memberId: string;
      subjectName: string;
      /** ISO string; null when the mentor has not logged any followup yet. */
      lastContactedAt: string | null;
    };

/**
 * The log side of the followups screen — every touchpoint the caller has
 * personally recorded, most-recent first. Complements MeFollowupItem which is
 * the inbox (things needing attention). Distinct entries per followup, unlike
 * the mentor_enrollment kind in MeFollowupItem which collapses to one per
 * enrollment.
 */
export type MeActivityItem =
  | {
      kind: 'soul_capture';
      id: string;
      subjectName: string;
      status: string;
      createdAt: string;
    }
  | {
      kind: 'fellowship_followup';
      id: string;
      memberId: string;
      subjectName: string;
      fellowshipId: string;
      fellowshipName: string;
      contactedAt: string;
      notes: string | null;
    }
  | {
      kind: 'department_followup';
      id: string;
      memberId: string;
      subjectName: string;
      branchDeptId: string;
      departmentName: string;
      contactedAt: string;
      notes: string | null;
    }
  | {
      kind: 'mentor_followup';
      id: string;
      enrollmentId: string;
      memberId: string;
      subjectName: string;
      contactedAt: string;
      note: string;
    };

// ── Branch role management — Branch System Admin assignments ─

export interface BranchRoleAssignment {
  id: string;
  memberId: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  roleName: string;
  assignedDate: string;
  isActive: boolean;
}

export interface AssignBranchRoleRequest {
  memberId: string;
}

import type {
  ApiResponse,
  AuthTokens,
  LoginRequest,
  LoginResponse,
  MemberProfile,
  SignupRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
  RefreshRequest,
  CreateBranchRequest,
  UpdateBranchRequest,
  CreateRegionRequest,
  GetLeadershipParams,
  AssignLeadershipRequest,
  UpdateMemberRequest,
  ApproveMemberRequest,
  AssignRoleRequest,
  MemberListParams,
  MemberWithBranchProtected,
  MemberDetailProtected,
  UpsertHealthRecordRequest,
  HealthRecordResponse,
  UnguardedMinor,
  DormantMinor,
  ReviewMinorRequest,
  CreateFellowshipRequest,
  UpdateFellowshipRequest,
  CreateFellowshipMeetingRequest,
  RecordAttendanceRequest,
  ListFellowshipFollowupsParams,
  CreateFellowshipFollowupRequest,
  UpdateFellowshipFollowupRequest,
  FellowshipListParams,
  AddFellowshipMemberRequest,
  CreateJoinRequestRequest,
  ReviewJoinRequestRequest,
  PaginatedResponse,
  AdminDashboardStats,
  BranchDashboardStats,
  MemberDashboardStats,
  FellowshipDashboardStats,
  CreateMemberRequest,
  CreateMemberResponse,
  ChangePasswordRequest,
  ReportsMemberGrowth,
  ReportsAttendanceTrend,
  ReportsFellowshipActivity,
  SwitchActiveBranchResponse,
  // New Believers
  NewBelieverEnrollment,
  NewBelieverEnrollmentWithMember,
  NewBelieverSession,
  NewBelieverAttendanceWithMember,
  NewBelieverHealthSummary,
  CreateEnrollmentRequest,
  UpdateEnrollmentRequest,
  EnrollmentListParams,
  BulkAdvanceEnrollmentsRequest,
  MentorFollowupItem,
  CreateMentorFollowupRequest,
  NewBelieverHats,
  BulkAdvanceEnrollmentsResult,
  CreateNewBelieverSessionRequest,
  UpdateNewBelieverSessionRequest,
  RecordNewBelieverAttendanceRequest,
  SessionListParams,
  // Forms & Data Capture
  FormSubmission,
  SubmitFormRequest,
  FormMemberSearchParams,
  FormMemberSearchResult,
  ListFormSubmissionsParams,
  UpdateFormSubmissionRequest,
  ExportFormSubmissionsParams,
  DormantAttendee,
  ListDormantAttendeesParams,
  ArchiveAttendeesRequest,
  ArchiveAttendeesResult,
  DormantVisitor,
  ListDormantVisitorsParams,
  FormsCapabilities,
  // Me / Leadership
  MeLeadershipResponse,
  // Branch role management
  BranchRoleAssignment,
  AssignBranchRoleRequest,
  // Attendance
  CreateServiceRequest,
  UpdateServiceRequest,
  ServiceListParams,
  ServiceSummary,
  ServiceWithDetail,
  RosterParams,
  RosterEntry,
  RecordServiceAttendanceRequest,
  RecordAttendanceResult,
  ServiceAttendanceRow,
  AttendanceTrendPoint,
  AttendanceTrendsParams,
  MissingMember,
  MissingMembersParams,
  BranchAttendanceRate,
  BranchAttendanceParams,
  AttendanceSummary,
  AttendanceSummaryParams,
  CohortDiffRequest,
  CohortDiffResult,
  MyAttendanceSnapshot,
  DepartmentAttendanceReport,
  FellowshipAttendanceReport,
} from '@kairos/types';

import type { FormType } from '@kairos/types';

import type {
  Branch,
  BranchWithRegion,
  Region,
  BranchLeadershipWithMember,
  Member,
  MemberRole,
  MemberRoleWithDetails,
  Fellowship,
  FellowshipWithBranch,
  FellowshipMeeting,
  FellowshipMember,
  FellowshipMemberWithDetails,
  FellowshipMeetingAttendance,
  FellowshipJoinRequest,
  FellowshipJoinRequestWithMember,
  FellowshipFollowup,
  FellowshipFollowupWithDetails,
  Department,
  BranchDepartment,
  BranchDepartmentWithDetails,
  DepartmentMember,
  DepartmentMemberWithDetails,
  DepartmentJoinRequest,
  DepartmentJoinRequestWithMember,
  MyDepartmentJoinRequest,
  DepartmentFollowup,
  DepartmentFollowupWithDetails,
  OverdueFollowupRow,
  DepartmentUniformOutfit,
  DepartmentUniformSchedule,
  DepartmentUniformScheduleWithOutfit,
  RotaTemplate,
  RotaTemplateWithSummary,
  RotaTemplateSlot,
  RotaPoolMember,
  RotaPoolMemberWithDetails,
  RotaInstance,
  RotaInstanceWithSummary,
  RotaAssignment,
  RotaAssignmentWithDetails,
  RotaSwapRequest,
  RotaSwapRequestWithDetails,
} from '@kairos/types';

import { ApiClient } from './client';

export function createApiClient(
  baseUrl: string,
  getToken?: () => string | null,
  options?: {
    getRefreshToken?: () => string | null;
    onTokenRefreshed?: (accessToken: string, refreshToken: string) => void;
    onAuthFailure?: () => void;
  },
) {
  const client = new ApiClient({ baseUrl, getToken, ...options });

  return {
    auth: {
      signup: (data: SignupRequest) =>
        client.post<ApiResponse<{ member: MemberProfile; verificationToken: string }>>('/api/auth/signup', data),
      login: (data: LoginRequest) =>
        client.post<ApiResponse<LoginResponse>>('/api/auth/login', data),
      refresh: (data: RefreshRequest) =>
        client.post<ApiResponse<AuthTokens>>('/api/auth/refresh', data),
      verifyEmail: (data: VerifyEmailRequest) =>
        client.post<ApiResponse<void>>('/api/auth/verify-email', data),
      forgotPassword: (data: ForgotPasswordRequest) =>
        client.post<ApiResponse<{ resetToken?: string }>>('/api/auth/forgot-password', data),
      resetPassword: (data: ResetPasswordRequest) =>
        client.post<ApiResponse<void>>('/api/auth/reset-password', data),
      changePassword: (data: ChangePasswordRequest) =>
        client.post<ApiResponse<void>>('/api/auth/change-password', data),
    },

    branches: {
      listPublic: () =>
        client.get<ApiResponse<BranchWithRegion[]>>('/api/public/branches'),
      list: () =>
        client.get<ApiResponse<BranchWithRegion[]>>('/api/branches'),
      get: (id: string) =>
        client.get<ApiResponse<Branch>>(`/api/branches/${encodeURIComponent(id)}`),
      create: (data: CreateBranchRequest) =>
        client.post<ApiResponse<Branch>>('/api/branches', data),
      update: (id: string, data: UpdateBranchRequest) =>
        client.patch<ApiResponse<Branch>>(`/api/branches/${encodeURIComponent(id)}`, data),
      delete: (id: string) =>
        client.delete<ApiResponse<void>>(`/api/branches/${encodeURIComponent(id)}`),
    },

    regions: {
      list: () =>
        client.get<ApiResponse<Region[]>>('/api/branches/regions'),
      create: (data: CreateRegionRequest) =>
        client.post<ApiResponse<Region>>('/api/branches/regions', data),
    },

    leadership: {
      list: (branchId: string, params?: GetLeadershipParams) => {
        const qs = new URLSearchParams();
        if (params?.includeHistory) qs.set('includeHistory', 'true');
        const query = qs.toString();
        return client.get<ApiResponse<BranchLeadershipWithMember[]>>(`/api/branches/${encodeURIComponent(branchId)}/leadership${query ? `?${query}` : ''}`);
      },
      assign: (branchId: string, data: AssignLeadershipRequest) =>
        client.post<ApiResponse<BranchLeadershipWithMember>>(`/api/branches/${encodeURIComponent(branchId)}/leadership`, data),
      remove: (branchId: string, leadershipId: string) =>
        client.delete<ApiResponse<void>>(`/api/branches/${encodeURIComponent(branchId)}/leadership/${encodeURIComponent(leadershipId)}`),
    },

    branchRoles: {
      // Branch System Admin assignment management. Gated by:
      //   list   → requireBranchAdmin (any branch admin can view)
      //   assign → requireBranchSystemAdmin
      //   revoke → requireBranchSystemAdmin (+ last-active-BSA lockout guard)
      list: (branchId: string) =>
        client.get<ApiResponse<BranchRoleAssignment[]>>(`/api/branches/${encodeURIComponent(branchId)}/roles`),
      assign: (branchId: string, data: AssignBranchRoleRequest) =>
        client.post<ApiResponse<BranchRoleAssignment>>(`/api/branches/${encodeURIComponent(branchId)}/roles`, data),
      revoke: (branchId: string, assignmentId: string) =>
        client.delete<ApiResponse<BranchRoleAssignment>>(`/api/branches/${encodeURIComponent(branchId)}/roles/${encodeURIComponent(assignmentId)}`),
    },

    members: {
      list: (params?: MemberListParams) => {
        const qs = new URLSearchParams();
        if (params?.page) qs.set('page', String(params.page));
        if (params?.limit) qs.set('limit', String(params.limit));
        if (params?.search) qs.set('search', params.search);
        if (params?.branchId) qs.set('branchId', params.branchId);
        if (params?.approvalStatus) qs.set('approvalStatus', params.approvalStatus);
        if (params?.fellowshipId) qs.set('fellowshipId', params.fellowshipId);
        const query = qs.toString();
        return client.get<ApiResponse<PaginatedResponse<MemberWithBranchProtected>>>(`/api/members${query ? `?${query}` : ''}`);
      },
      get: (id: string) =>
        client.get<ApiResponse<MemberDetailProtected>>(`/api/members/${encodeURIComponent(id)}`),
      update: (id: string, data: UpdateMemberRequest) =>
        client.patch<ApiResponse<Member>>(`/api/members/${encodeURIComponent(id)}`, data),
      approve: (id: string, data: ApproveMemberRequest) =>
        client.post<ApiResponse<Member>>(`/api/members/${encodeURIComponent(id)}/approve`, data),
      deactivate: (id: string) =>
        client.delete<ApiResponse<Member>>(`/api/members/${encodeURIComponent(id)}`),
      create: (data: CreateMemberRequest) =>
        client.post<ApiResponse<CreateMemberResponse>>('/api/members', data),
      importCsv: (file: File) =>
        client.postForm<ApiResponse<{ imported: number; errors: string[] }>>('/api/members/import', file),
      exportCsv: () =>
        client.getBlob('/api/members/export'),
      reactivate: (id: string) =>
        client.post<ApiResponse<Member>>(`/api/members/${encodeURIComponent(id)}/reactivate`, {}),
      setMembershipClass: (id: string, completedAt: string | null) =>
        client.post<ApiResponse<Member>>(
          `/api/members/${encodeURIComponent(id)}/membership-class`,
          { completedAt },
        ),
      stats: (id: string) =>
        client.get<ApiResponse<MemberDashboardStats>>(`/api/members/${encodeURIComponent(id)}/stats`),
      me: () =>
        client.get<ApiResponse<Member>>('/api/members/me'),
      switchActiveBranch: (id: string) =>
        client.patch<ApiResponse<SwitchActiveBranchResponse>>(`/api/members/${encodeURIComponent(id)}/active-branch`, {}),
      getHealthRecord: (id: string) =>
        client.get<ApiResponse<HealthRecordResponse>>(`/api/members/${encodeURIComponent(id)}/health-record`),
      upsertHealthRecord: (id: string, data: UpsertHealthRecordRequest) =>
        client.put<ApiResponse<HealthRecordResponse>>(`/api/members/${encodeURIComponent(id)}/health-record`, data),
      listUnguardedMinors: (params?: { branchId?: string }) => {
        const qs = new URLSearchParams();
        if (params?.branchId) qs.set('branchId', params.branchId);
        const query = qs.toString();
        return client.get<ApiResponse<UnguardedMinor[]>>(`/api/members/safeguarding/unguarded-minors${query ? `?${query}` : ''}`);
      },
      listDormantMinors: (params?: { branchId?: string }) => {
        const qs = new URLSearchParams();
        if (params?.branchId) qs.set('branchId', params.branchId);
        const query = qs.toString();
        return client.get<ApiResponse<DormantMinor[]>>(`/api/members/safeguarding/dormant-minors${query ? `?${query}` : ''}`);
      },
      reviewMinor: (id: string, data: ReviewMinorRequest) =>
        client.post<ApiResponse<{ id: string }>>(`/api/members/safeguarding/dormant-minors/${encodeURIComponent(id)}/review`, data),
      roles: {
        listAll: () =>
          client.get<ApiResponse<{ id: string; roleName: string; description: string | null }[]>>('/api/members/roles'),
        list: (memberId: string) =>
          client.get<ApiResponse<MemberRoleWithDetails[]>>(`/api/members/${encodeURIComponent(memberId)}/roles`),
        assign: (memberId: string, data: AssignRoleRequest) =>
          client.post<ApiResponse<MemberRole>>(`/api/members/${encodeURIComponent(memberId)}/roles`, data),
        remove: (memberId: string, roleAssignmentId: string) =>
          client.delete<ApiResponse<MemberRole>>(`/api/members/${encodeURIComponent(memberId)}/roles/${encodeURIComponent(roleAssignmentId)}`),
      },
    },

    fellowships: {
      list: (params?: FellowshipListParams) => {
        const qs = new URLSearchParams();
        if (params?.page) qs.set('page', String(params.page));
        if (params?.limit) qs.set('limit', String(params.limit));
        if (params?.fellowshipType) qs.set('fellowshipType', params.fellowshipType);
        if (params?.branchId) qs.set('branchId', params.branchId);
        if (params?.memberId) qs.set('memberId', params.memberId);
        const query = qs.toString();
        return client.get<ApiResponse<PaginatedResponse<FellowshipWithBranch>>>(`/api/fellowships${query ? `?${query}` : ''}`);
      },
      map: () =>
        client.get<ApiResponse<FellowshipWithBranch[]>>('/api/fellowships/map'),
      get: (id: string) =>
        client.get<ApiResponse<FellowshipWithBranch>>(`/api/fellowships/${encodeURIComponent(id)}`),
      create: (data: CreateFellowshipRequest) =>
        client.post<ApiResponse<Fellowship>>('/api/fellowships', data),
      update: (id: string, data: UpdateFellowshipRequest) =>
        client.patch<ApiResponse<Fellowship>>(`/api/fellowships/${encodeURIComponent(id)}`, data),
      delete: (id: string) =>
        client.delete<ApiResponse<void>>(`/api/fellowships/${encodeURIComponent(id)}`),
      stats: (fellowshipId: string) =>
        client.get<ApiResponse<{
          fellowship: { id: string; name: string; branchName: string | null };
          members: { total: number; active: number; inactive: number };
          meetings: { last90d: number; byWeek: Array<{ week: string; count: number }> };
          followups: { total: number; open: number; closed: number };
          joinRequests: { recent30d: number; pending: number };
        }>>(`/api/fellowships/${encodeURIComponent(fellowshipId)}/stats`),
      members: {
        list: (fellowshipId: string) =>
          client.get<ApiResponse<FellowshipMemberWithDetails[]>>(`/api/fellowships/${encodeURIComponent(fellowshipId)}/members`),
        add: (fellowshipId: string, data: AddFellowshipMemberRequest) =>
          client.post<ApiResponse<FellowshipMember>>(`/api/fellowships/${encodeURIComponent(fellowshipId)}/members`, data),
        remove: (fellowshipId: string, memberId: string) =>
          client.delete<ApiResponse<FellowshipMember>>(`/api/fellowships/${encodeURIComponent(fellowshipId)}/members/${encodeURIComponent(memberId)}`),
      },
      joinRequests: {
        create: (fellowshipId: string, data: CreateJoinRequestRequest) =>
          client.post<ApiResponse<FellowshipJoinRequest>>(`/api/fellowships/${encodeURIComponent(fellowshipId)}/join-requests`, data),
        list: (fellowshipId: string) =>
          client.get<ApiResponse<FellowshipJoinRequestWithMember[]>>(`/api/fellowships/${encodeURIComponent(fellowshipId)}/join-requests`),
        review: (fellowshipId: string, requestId: string, data: ReviewJoinRequestRequest) =>
          client.patch<ApiResponse<FellowshipJoinRequest>>(`/api/fellowships/${encodeURIComponent(fellowshipId)}/join-requests/${encodeURIComponent(requestId)}`, data),
      },
      meetings: {
        list: (fellowshipId: string) =>
          client.get<ApiResponse<FellowshipMeeting[]>>(`/api/fellowships/${encodeURIComponent(fellowshipId)}/meetings`),
        create: (fellowshipId: string, data: CreateFellowshipMeetingRequest) =>
          client.post<ApiResponse<FellowshipMeeting>>(`/api/fellowships/${encodeURIComponent(fellowshipId)}/meetings`, data),
        update: (fellowshipId: string, meetingId: string, data: Partial<CreateFellowshipMeetingRequest>) =>
          client.patch<ApiResponse<FellowshipMeeting>>(`/api/fellowships/${encodeURIComponent(fellowshipId)}/meetings/${encodeURIComponent(meetingId)}`, data),
      },
      attendance: {
        record: (fellowshipId: string, meetingId: string, data: RecordAttendanceRequest) =>
          client.post<ApiResponse<void>>(`/api/fellowships/${encodeURIComponent(fellowshipId)}/meetings/${encodeURIComponent(meetingId)}/attendance`, data),
        get: (fellowshipId: string, meetingId: string) =>
          client.get<ApiResponse<FellowshipMeetingAttendance[]>>(`/api/fellowships/${encodeURIComponent(fellowshipId)}/meetings/${encodeURIComponent(meetingId)}/attendance`),
        summary: (fellowshipId: string) =>
          client.get<ApiResponse<unknown[]>>(`/api/fellowships/${encodeURIComponent(fellowshipId)}/attendance/summary`),
      },
      followups: {
        listForFellowship: (fellowshipId: string, params?: ListFellowshipFollowupsParams) => {
          const qs = new URLSearchParams();
          if (params?.limit) qs.set('limit', String(params.limit));
          if (params?.days) qs.set('days', String(params.days));
          if (params?.memberId) qs.set('memberId', params.memberId);
          const query = qs.toString();
          return client.get<ApiResponse<FellowshipFollowupWithDetails[]>>(
            `/api/fellowships/${encodeURIComponent(fellowshipId)}/followups${query ? `?${query}` : ''}`,
          );
        },
        listOverdue: (fellowshipId: string, days?: number) => {
          const qs = new URLSearchParams();
          if (days !== undefined) qs.set('days', String(days));
          const query = qs.toString();
          return client.get<ApiResponse<OverdueFollowupRow[]>>(
            `/api/fellowships/${encodeURIComponent(fellowshipId)}/followups/overdue${query ? `?${query}` : ''}`,
          );
        },
        listForMember: (fellowshipId: string, memberId: string) =>
          client.get<ApiResponse<FellowshipFollowupWithDetails[]>>(
            `/api/fellowships/${encodeURIComponent(fellowshipId)}/members/${encodeURIComponent(memberId)}/followups`,
          ),
        create: (
          fellowshipId: string,
          memberId: string,
          data: CreateFellowshipFollowupRequest,
        ) =>
          client.post<ApiResponse<FellowshipFollowup>>(
            `/api/fellowships/${encodeURIComponent(fellowshipId)}/members/${encodeURIComponent(memberId)}/followups`,
            data,
          ),
        update: (
          fellowshipId: string,
          followupId: string,
          data: UpdateFellowshipFollowupRequest,
        ) =>
          client.patch<ApiResponse<FellowshipFollowup>>(
            `/api/fellowships/${encodeURIComponent(fellowshipId)}/followups/${encodeURIComponent(followupId)}`,
            data,
          ),
        delete: (fellowshipId: string, followupId: string) =>
          client.delete<ApiResponse<FellowshipFollowup>>(
            `/api/fellowships/${encodeURIComponent(fellowshipId)}/followups/${encodeURIComponent(followupId)}`,
          ),
      },
    },

    departments: {
      // Global catalogue
      listGlobal: () =>
        client.get<ApiResponse<Department[]>>('/api/departments/global'),
      createGlobal: (data: { departmentName: string; description?: string | null; iconKey?: string | null }) =>
        client.post<ApiResponse<Department>>('/api/departments/global', data),
      updateGlobal: (id: string, data: Partial<{ departmentName: string; description: string | null; iconKey: string | null; isActive: boolean }>) =>
        client.patch<ApiResponse<Department>>(`/api/departments/global/${encodeURIComponent(id)}`, data),

      // Member-facing aggregation
      mine: () =>
        client.get<ApiResponse<BranchDepartmentWithDetails[]>>('/api/departments/mine'),

      // Branch department CRUD
      list: (params?: { page?: number; limit?: number; branchId?: string; departmentId?: string; memberId?: string }) => {
        const qs = new URLSearchParams();
        if (params?.page) qs.set('page', String(params.page));
        if (params?.limit) qs.set('limit', String(params.limit));
        if (params?.branchId) qs.set('branchId', params.branchId);
        if (params?.departmentId) qs.set('departmentId', params.departmentId);
        if (params?.memberId) qs.set('memberId', params.memberId);
        const query = qs.toString();
        return client.get<ApiResponse<PaginatedResponse<BranchDepartmentWithDetails>>>(`/api/departments${query ? `?${query}` : ''}`);
      },
      get: (id: string) =>
        client.get<ApiResponse<BranchDepartmentWithDetails>>(`/api/departments/${encodeURIComponent(id)}`),
      create: (data: {
        branchId: string;
        departmentId: string;
        leadMemberId: string;
        deputyMemberId?: string | null;
        description?: string | null;
        startDate?: string;
      }) =>
        client.post<ApiResponse<BranchDepartment>>('/api/departments', data),
      update: (id: string, data: Partial<{ leadMemberId: string; deputyMemberId: string | null; description: string | null; endDate: string | null; isActive: boolean }>) =>
        client.patch<ApiResponse<BranchDepartment>>(`/api/departments/${encodeURIComponent(id)}`, data),
      deactivate: (id: string) =>
        client.delete<ApiResponse<BranchDepartment>>(`/api/departments/${encodeURIComponent(id)}`),

      // Members
      members: {
        list: (branchDeptId: string) =>
          client.get<ApiResponse<DepartmentMemberWithDetails[]>>(`/api/departments/${encodeURIComponent(branchDeptId)}/members`),
        add: (branchDeptId: string, data: { memberId: string; notes?: string | null }) =>
          client.post<ApiResponse<DepartmentMember>>(`/api/departments/${encodeURIComponent(branchDeptId)}/members`, data),
        remove: (branchDeptId: string, memberId: string) =>
          client.delete<ApiResponse<DepartmentMember>>(`/api/departments/${encodeURIComponent(branchDeptId)}/members/${encodeURIComponent(memberId)}`),
      },

      // Join requests / recruitment pipeline
      joinRequests: {
        create: (branchDeptId: string, data: { notes?: string | null }) =>
          client.post<ApiResponse<DepartmentJoinRequest>>(`/api/departments/${encodeURIComponent(branchDeptId)}/join-requests`, data),
        listMine: () =>
          client.get<ApiResponse<MyDepartmentJoinRequest[]>>(`/api/departments/me/join-requests`),
        list: (branchDeptId: string, params?: { stage?: 'open' | 'all' | 'terminal' }) => {
          const qs = new URLSearchParams();
          if (params?.stage) qs.set('stage', params.stage);
          const query = qs.toString();
          return client.get<ApiResponse<DepartmentJoinRequestWithMember[]>>(
            `/api/departments/${encodeURIComponent(branchDeptId)}/join-requests${query ? `?${query}` : ''}`,
          );
        },
        scheduleInterview: (
          branchDeptId: string,
          requestId: string,
          data: {
            interviewScheduledAt: string;
            interviewFormat: 'in_person' | 'virtual';
            interviewLocation?: string;
            interviewerOneId: string;
            interviewerTwoId?: string;
          },
        ) =>
          client.post<ApiResponse<DepartmentJoinRequest>>(
            `/api/departments/${encodeURIComponent(branchDeptId)}/join-requests/${encodeURIComponent(requestId)}/schedule-interview`,
            data,
          ),
        recordInterview: (
          branchDeptId: string,
          requestId: string,
          data: { interviewOutcome: 'pass' | 'fail'; interviewNotes?: string },
        ) =>
          client.post<ApiResponse<DepartmentJoinRequest>>(
            `/api/departments/${encodeURIComponent(branchDeptId)}/join-requests/${encodeURIComponent(requestId)}/record-interview`,
            data,
          ),
        extendOffer: (
          branchDeptId: string,
          requestId: string,
          data: { offerExpiresAt?: string; offerMessage?: string; probationDays?: number },
        ) =>
          client.post<ApiResponse<DepartmentJoinRequest>>(
            `/api/departments/${encodeURIComponent(branchDeptId)}/join-requests/${encodeURIComponent(requestId)}/extend-offer`,
            data,
          ),
        respondToOffer: (
          branchDeptId: string,
          requestId: string,
          data: { offerResponse: 'accepted' | 'declined' },
        ) =>
          client.post<ApiResponse<DepartmentJoinRequest>>(
            `/api/departments/${encodeURIComponent(branchDeptId)}/join-requests/${encodeURIComponent(requestId)}/respond-offer`,
            data,
          ),
        withdraw: (branchDeptId: string, requestId: string) =>
          client.post<ApiResponse<DepartmentJoinRequest>>(
            `/api/departments/${encodeURIComponent(branchDeptId)}/join-requests/${encodeURIComponent(requestId)}/withdraw`,
            {},
          ),
        reject: (branchDeptId: string, requestId: string, data: { reviewNotes?: string } = {}) =>
          client.post<ApiResponse<DepartmentJoinRequest>>(
            `/api/departments/${encodeURIComponent(branchDeptId)}/join-requests/${encodeURIComponent(requestId)}/reject`,
            data,
          ),
        evaluateProbation: (
          branchDeptId: string,
          requestId: string,
          data: { probationOutcome: 'passed' | 'failed'; probationNotes?: string },
        ) =>
          client.post<ApiResponse<DepartmentJoinRequest>>(
            `/api/departments/${encodeURIComponent(branchDeptId)}/join-requests/${encodeURIComponent(requestId)}/evaluate-probation`,
            data,
          ),
      },

      // Followups
      followups: {
        listForDepartment: (branchDeptId: string, params?: { memberId?: string; from?: string; to?: string }) => {
          const qs = new URLSearchParams();
          if (params?.memberId) qs.set('memberId', params.memberId);
          if (params?.from) qs.set('from', params.from);
          if (params?.to) qs.set('to', params.to);
          const query = qs.toString();
          return client.get<ApiResponse<DepartmentFollowupWithDetails[]>>(`/api/departments/${encodeURIComponent(branchDeptId)}/followups${query ? `?${query}` : ''}`);
        },
        listOverdue: (branchDeptId: string, days?: number) => {
          const qs = new URLSearchParams();
          if (days !== undefined) qs.set('days', String(days));
          const query = qs.toString();
          return client.get<ApiResponse<OverdueFollowupRow[]>>(`/api/departments/${encodeURIComponent(branchDeptId)}/followups/overdue${query ? `?${query}` : ''}`);
        },
        listForMember: (branchDeptId: string, memberId: string) =>
          client.get<ApiResponse<DepartmentFollowupWithDetails[]>>(`/api/departments/${encodeURIComponent(branchDeptId)}/members/${encodeURIComponent(memberId)}/followups`),
        create: (
          branchDeptId: string,
          memberId: string,
          data: {
            contactedAt?: string;
            contactMethod: string;
            contactStatus: string;
            durationMinutes?: number | null;
            notes?: string | null;
            nextFollowUpDate?: string | null;
            assignedToId?: string | null;
          },
        ) =>
          client.post<ApiResponse<DepartmentFollowup>>(`/api/departments/${encodeURIComponent(branchDeptId)}/members/${encodeURIComponent(memberId)}/followups`, data),
        update: (
          branchDeptId: string,
          followupId: string,
          data: Partial<{
            contactedAt: string;
            contactMethod: string;
            contactStatus: string;
            durationMinutes: number | null;
            notes: string | null;
            nextFollowUpDate: string | null;
            assignedToId: string | null;
          }>,
        ) =>
          client.patch<ApiResponse<DepartmentFollowup>>(`/api/departments/${encodeURIComponent(branchDeptId)}/followups/${encodeURIComponent(followupId)}`, data),
        delete: (branchDeptId: string, followupId: string) =>
          client.delete<ApiResponse<DepartmentFollowup>>(`/api/departments/${encodeURIComponent(branchDeptId)}/followups/${encodeURIComponent(followupId)}`),
      },

      // Uniforms
      uniforms: {
        listOutfits: (branchDeptId: string, params?: { isActive?: boolean; genderTarget?: string }) => {
          const qs = new URLSearchParams();
          if (params?.isActive !== undefined) qs.set('isActive', String(params.isActive));
          if (params?.genderTarget) qs.set('genderTarget', params.genderTarget);
          const query = qs.toString();
          return client.get<ApiResponse<DepartmentUniformOutfit[]>>(`/api/departments/${encodeURIComponent(branchDeptId)}/uniforms${query ? `?${query}` : ''}`);
        },
        createOutfit: (
          branchDeptId: string,
          data: { name: string; imageUrl: string; genderTarget?: string; notes?: string | null },
        ) =>
          client.post<ApiResponse<DepartmentUniformOutfit>>(`/api/departments/${encodeURIComponent(branchDeptId)}/uniforms`, data),
        updateOutfit: (
          branchDeptId: string,
          outfitId: string,
          data: Partial<{ name: string; imageUrl: string; genderTarget: string; notes: string | null; isActive: boolean }>,
        ) =>
          client.patch<ApiResponse<DepartmentUniformOutfit>>(`/api/departments/${encodeURIComponent(branchDeptId)}/uniforms/${encodeURIComponent(outfitId)}`, data),
        deactivateOutfit: (branchDeptId: string, outfitId: string) =>
          client.delete<ApiResponse<DepartmentUniformOutfit>>(`/api/departments/${encodeURIComponent(branchDeptId)}/uniforms/${encodeURIComponent(outfitId)}`),
        listSchedule: (branchDeptId: string, params?: { from?: string; to?: string }) => {
          const qs = new URLSearchParams();
          if (params?.from) qs.set('from', params.from);
          if (params?.to) qs.set('to', params.to);
          const query = qs.toString();
          return client.get<ApiResponse<DepartmentUniformScheduleWithOutfit[]>>(`/api/departments/${encodeURIComponent(branchDeptId)}/uniform-schedule${query ? `?${query}` : ''}`);
        },
        upcoming: (branchDeptId: string) =>
          client.get<ApiResponse<DepartmentUniformScheduleWithOutfit[]>>(`/api/departments/${encodeURIComponent(branchDeptId)}/uniform-schedule/upcoming`),
        assignSchedule: (
          branchDeptId: string,
          data: { outfitId: string; serviceDate: string; genderTarget?: string; notes?: string | null },
        ) =>
          client.post<ApiResponse<DepartmentUniformSchedule>>(`/api/departments/${encodeURIComponent(branchDeptId)}/uniform-schedule`, data),
        removeAssignment: (branchDeptId: string, assignmentId: string) =>
          client.delete<ApiResponse<DepartmentUniformSchedule>>(`/api/departments/${encodeURIComponent(branchDeptId)}/uniform-schedule/${encodeURIComponent(assignmentId)}`),
      },

      // Rota
      rota: {
        // Templates
        listTemplates: (branchDeptId: string, params?: { includeArchived?: boolean }) => {
          const qs = new URLSearchParams();
          if (params?.includeArchived) qs.set('includeArchived', 'true');
          const query = qs.toString();
          return client.get<ApiResponse<RotaTemplateWithSummary[]>>(
            `/api/departments/${encodeURIComponent(branchDeptId)}/rota-templates${query ? `?${query}` : ''}`,
          );
        },
        createTemplate: (
          branchDeptId: string,
          data: { name: string; weekday: number; defaultStartTime?: string | null; notes?: string | null },
        ) =>
          client.post<ApiResponse<RotaTemplate>>(`/api/departments/${encodeURIComponent(branchDeptId)}/rota-templates`, data),
        updateTemplate: (
          branchDeptId: string,
          templateId: string,
          data: Partial<{ name: string; weekday: number; defaultStartTime: string | null; notes: string | null; isActive: boolean }>,
        ) =>
          client.patch<ApiResponse<RotaTemplate>>(`/api/departments/${encodeURIComponent(branchDeptId)}/rota-templates/${encodeURIComponent(templateId)}`, data),
        deactivateTemplate: (branchDeptId: string, templateId: string) =>
          client.delete<ApiResponse<{ id: string }>>(`/api/departments/${encodeURIComponent(branchDeptId)}/rota-templates/${encodeURIComponent(templateId)}`),

        // Slots
        listSlots: (branchDeptId: string, templateId: string) =>
          client.get<ApiResponse<RotaTemplateSlot[]>>(`/api/departments/${encodeURIComponent(branchDeptId)}/rota-templates/${encodeURIComponent(templateId)}/slots`),
        createSlot: (
          branchDeptId: string,
          templateId: string,
          data: { roleName: string; positionsRequired?: number; notes?: string | null; sortOrder?: number },
        ) =>
          client.post<ApiResponse<RotaTemplateSlot>>(`/api/departments/${encodeURIComponent(branchDeptId)}/rota-templates/${encodeURIComponent(templateId)}/slots`, data),
        updateSlot: (
          branchDeptId: string,
          templateId: string,
          slotId: string,
          data: Partial<{ roleName: string; positionsRequired: number; notes: string | null; sortOrder: number; isActive: boolean }>,
        ) =>
          client.patch<ApiResponse<RotaTemplateSlot>>(`/api/departments/${encodeURIComponent(branchDeptId)}/rota-templates/${encodeURIComponent(templateId)}/slots/${encodeURIComponent(slotId)}`, data),
        deleteSlot: (branchDeptId: string, templateId: string, slotId: string) =>
          client.delete<ApiResponse<{ id: string }>>(`/api/departments/${encodeURIComponent(branchDeptId)}/rota-templates/${encodeURIComponent(templateId)}/slots/${encodeURIComponent(slotId)}`),

        // Pool
        listPool: (branchDeptId: string, templateId: string) =>
          client.get<ApiResponse<RotaPoolMemberWithDetails[]>>(`/api/departments/${encodeURIComponent(branchDeptId)}/rota-templates/${encodeURIComponent(templateId)}/pool`),
        addPoolMember: (
          branchDeptId: string,
          templateId: string,
          data: { memberId: string; preferredRoleName?: string | null; notes?: string | null },
        ) =>
          client.post<ApiResponse<RotaPoolMember>>(`/api/departments/${encodeURIComponent(branchDeptId)}/rota-templates/${encodeURIComponent(templateId)}/pool`, data),
        removePoolMember: (branchDeptId: string, templateId: string, poolMemberId: string) =>
          client.delete<ApiResponse<{ id: string }>>(`/api/departments/${encodeURIComponent(branchDeptId)}/rota-templates/${encodeURIComponent(templateId)}/pool/${encodeURIComponent(poolMemberId)}`),

        // Generation
        generate: (
          branchDeptId: string,
          templateId: string,
          data: { weeks: number; startDate: string },
        ) =>
          client.post<ApiResponse<{ instanceCount: number; assignmentCount: number; openSlotCount: number }>>(
            `/api/departments/${encodeURIComponent(branchDeptId)}/rota-templates/${encodeURIComponent(templateId)}/generate`,
            data,
          ),

        regenerateInstance: (branchDeptId: string, instanceId: string) =>
          client.post<ApiResponse<{ instanceId: string; assignmentCount: number; openSlotCount: number }>>(
            `/api/departments/${encodeURIComponent(branchDeptId)}/rota-instances/${encodeURIComponent(instanceId)}/regenerate`,
            {},
          ),

        rotaStats: (branchDeptId: string, params?: { windowDays?: number }) => {
          const qs = new URLSearchParams();
          if (params?.windowDays != null) qs.set('windowDays', String(params.windowDays));
          const query = qs.toString();
          return client.get<ApiResponse<{
            branchDepartmentId: string;
            windowDays: number;
            upcomingCount: number;
            publishedCount: number;
            draftCount: number;
          }>>(
            `/api/departments/${encodeURIComponent(branchDeptId)}/rota-stats${query ? `?${query}` : ''}`,
          );
        },

        // Instances
        listInstances: (branchDeptId: string, params?: { from?: string; to?: string }) => {
          const qs = new URLSearchParams();
          if (params?.from) qs.set('from', params.from);
          if (params?.to) qs.set('to', params.to);
          const query = qs.toString();
          return client.get<ApiResponse<RotaInstanceWithSummary[]>>(`/api/departments/${encodeURIComponent(branchDeptId)}/rota-instances${query ? `?${query}` : ''}`);
        },
        getInstance: (branchDeptId: string, instanceId: string) =>
          client.get<ApiResponse<RotaInstance & { assignments: RotaAssignmentWithDetails[] }>>(
            `/api/departments/${encodeURIComponent(branchDeptId)}/rota-instances/${encodeURIComponent(instanceId)}`,
          ),
        updateInstanceStatus: (
          branchDeptId: string,
          instanceId: string,
          data: { status: 'Draft' | 'Published' | 'Cancelled'; notes?: string | null },
        ) =>
          client.patch<ApiResponse<RotaInstance>>(
            `/api/departments/${encodeURIComponent(branchDeptId)}/rota-instances/${encodeURIComponent(instanceId)}`,
            data,
          ),
        updateAssignment: (
          branchDeptId: string,
          instanceId: string,
          assignmentId: string,
          data: Partial<{ memberId: string | null; status: 'Assigned' | 'Confirmed' | 'Declined' | 'Swapped' | 'Open'; notes: string | null }>,
        ) =>
          client.patch<ApiResponse<RotaAssignment>>(
            `/api/departments/${encodeURIComponent(branchDeptId)}/rota-instances/${encodeURIComponent(instanceId)}/assignments/${encodeURIComponent(assignmentId)}`,
            data,
          ),

        // Swap requests
        createSwapRequest: (
          branchDeptId: string,
          instanceId: string,
          assignmentId: string,
          data: { proposedMemberId?: string | null; reason?: string | null },
        ) =>
          client.post<ApiResponse<RotaSwapRequest>>(
            `/api/departments/${encodeURIComponent(branchDeptId)}/rota-instances/${encodeURIComponent(instanceId)}/assignments/${encodeURIComponent(assignmentId)}/swap-requests`,
            data,
          ),
        listSwapRequests: (branchDeptId: string, params?: { status?: 'pending' | 'approved' | 'rejected' | 'cancelled' }) => {
          const qs = new URLSearchParams();
          if (params?.status) qs.set('status', params.status);
          const query = qs.toString();
          return client.get<ApiResponse<RotaSwapRequestWithDetails[]>>(`/api/departments/${encodeURIComponent(branchDeptId)}/rota-swap-requests${query ? `?${query}` : ''}`);
        },
        reviewSwapRequest: (
          branchDeptId: string,
          requestId: string,
          data: { decision: 'approved' | 'rejected'; reviewNotes?: string | null },
        ) =>
          client.patch<ApiResponse<RotaSwapRequest>>(
            `/api/departments/${encodeURIComponent(branchDeptId)}/rota-swap-requests/${encodeURIComponent(requestId)}`,
            data,
          ),
      },
    },

    me: {
      rota: (params?: { from?: string; to?: string }) => {
        const qs = new URLSearchParams();
        if (params?.from) qs.set('from', params.from);
        if (params?.to) qs.set('to', params.to);
        const query = qs.toString();
        return client.get<ApiResponse<Array<{
          assignmentId: string;
          instanceId: string;
          branchDepartmentId: string;
          templateId: string;
          templateName: string;
          serviceDate: string;
          startTime: string | null;
          slotRoleName: string;
          status: string;
          instanceStatus: string;
        }>>>(`/api/me/rota${query ? `?${query}` : ''}`);
      },
      leadership: () =>
        client.get<ApiResponse<MeLeadershipResponse>>('/api/me/leadership'),
    },

    analytics: {
      adminStats: () =>
        client.get<ApiResponse<AdminDashboardStats>>('/api/analytics/admin'),
      branchStats: () =>
        client.get<ApiResponse<BranchDashboardStats>>('/api/analytics/branch'),
      fellowshipStats: () =>
        client.get<ApiResponse<FellowshipDashboardStats>>('/api/analytics/fellowship'),
      memberStats: () =>
        client.get<ApiResponse<MemberDashboardStats>>('/api/analytics/member'),
    },

    reports: {
      memberGrowth: () =>
        client.get<ApiResponse<ReportsMemberGrowth[]>>('/api/reports/member-growth'),
      attendanceTrend: () =>
        client.get<ApiResponse<ReportsAttendanceTrend[]>>('/api/reports/attendance-trend'),
      fellowshipActivity: () =>
        client.get<ApiResponse<ReportsFellowshipActivity[]>>('/api/reports/fellowship-activity'),
    },

    outreach: {
      programs: {
        list: (params?: {
          page?: number;
          limit?: number;
          search?: string;
          branchId?: string;
          isCompleted?: boolean;
          coordinatorId?: string;
          startDate?: string;
          endDate?: string;
        }) => {
          const qs = new URLSearchParams();
          if (params?.page) qs.set('page', String(params.page));
          if (params?.limit) qs.set('limit', String(params.limit));
          if (params?.search) qs.set('search', params.search);
          if (params?.branchId) qs.set('branchId', params.branchId);
          if (params?.isCompleted !== undefined) qs.set('isCompleted', String(params.isCompleted));
          if (params?.coordinatorId) qs.set('coordinatorId', params.coordinatorId);
          if (params?.startDate) qs.set('startDate', params.startDate);
          if (params?.endDate) qs.set('endDate', params.endDate);
          const query = qs.toString();
          return client.get<ApiResponse<PaginatedResponse<any>>>(`/api/outreach/programs${query ? `?${query}` : ''}`);
        },
        get: (id: string) =>
          client.get<ApiResponse<any>>(`/api/outreach/programs/${encodeURIComponent(id)}`),
        create: (data: any) =>
          client.post<ApiResponse<any>>('/api/outreach/programs', data),
        update: (id: string, data: any) =>
          client.put<ApiResponse<any>>(`/api/outreach/programs/${encodeURIComponent(id)}`, data),
        registerWorker: (programId: string, data: { memberId: string; role?: string; notes?: string }) =>
          client.post<ApiResponse<any>>(`/api/outreach/programs/${encodeURIComponent(programId)}/participants`, data),
      },
    },

    souls: {
      list: (params?: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        assignedMemberId?: string;
        outreachId?: string;
        overdueOnly?: boolean;
      }) => {
        const qs = new URLSearchParams();
        if (params?.page) qs.set('page', String(params.page));
        if (params?.limit) qs.set('limit', String(params.limit));
        if (params?.search) qs.set('search', params.search);
        if (params?.status) qs.set('status', params.status);
        if (params?.assignedMemberId) qs.set('assignedMemberId', params.assignedMemberId);
        if (params?.outreachId) qs.set('outreachId', params.outreachId);
        if (params?.overdueOnly !== undefined) qs.set('overdueOnly', String(params.overdueOnly));
        const query = qs.toString();
        return client.get<ApiResponse<PaginatedResponse<any>>>(`/api/souls${query ? `?${query}` : ''}`);
      },
      get: (id: string) =>
        client.get<ApiResponse<any>>(`/api/souls/${encodeURIComponent(id)}`),
      capture: (data: any) =>
        client.post<ApiResponse<any>>('/api/souls', data),
      updateStatus: (id: string, data: { status: string; convertedToMemberId?: string }) =>
        client.put<ApiResponse<any>>(`/api/souls/${encodeURIComponent(id)}/status`, data),
      reassign: (id: string, data: { assignedMemberId: string }) =>
        client.put<ApiResponse<any>>(`/api/souls/${encodeURIComponent(id)}/assign`, data),
      bulkReassign: (data: { soulIds: string[]; assignedMemberId: string }) =>
        client.post<ApiResponse<{ reassignedCount: number; soulIds: string[] }>>('/api/souls/bulk-assign', data),
      logFollowUp: (id: string, data: any) =>
        client.post<ApiResponse<any>>(`/api/souls/${encodeURIComponent(id)}/follow-ups`, data),
      getFollowUps: (id: string, params?: { page?: number; limit?: number }) => {
        const qs = new URLSearchParams();
        if (params?.page) qs.set('page', String(params.page));
        if (params?.limit) qs.set('limit', String(params.limit));
        const query = qs.toString();
        return client.get<ApiResponse<any>>(`/api/souls/${encodeURIComponent(id)}/follow-ups${query ? `?${query}` : ''}`);
      },
      convert: (id: string) =>
        client.post<ApiResponse<any>>(`/api/souls/${encodeURIComponent(id)}/convert`, {}),
      exportCsv: () =>
        client.getBlob('/api/souls/export'),
    },

    dashboard: {
      overview: (params?: { dateFrom?: string; dateTo?: string; programId?: string }) => {
        const qs = new URLSearchParams();
        if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
        if (params?.dateTo) qs.set('dateTo', params.dateTo);
        if (params?.programId) qs.set('programId', params.programId);
        const query = qs.toString();
        return client.get<ApiResponse<any>>(`/api/outreach/dashboard/overview${query ? `?${query}` : ''}`);
      },
      analytics: (params?: { dateFrom?: string; dateTo?: string; programId?: string }) => {
        const qs = new URLSearchParams();
        if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
        if (params?.dateTo) qs.set('dateTo', params.dateTo);
        if (params?.programId) qs.set('programId', params.programId);
        const query = qs.toString();
        return client.get<ApiResponse<any>>(`/api/outreach/dashboard/analytics${query ? `?${query}` : ''}`);
      },
      souls: (params?: {
        ragStatus?: 'RED' | 'AMBER' | 'GREEN';
        status?: string;
        page?: number;
        limit?: number;
        dateFrom?: string;
        dateTo?: string;
        programId?: string;
      }) => {
        const qs = new URLSearchParams();
        if (params?.ragStatus) qs.set('ragStatus', params.ragStatus);
        if (params?.status) qs.set('status', params.status);
        if (params?.page) qs.set('page', String(params.page));
        if (params?.limit) qs.set('limit', String(params.limit));
        if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
        if (params?.dateTo) qs.set('dateTo', params.dateTo);
        if (params?.programId) qs.set('programId', params.programId);
        const query = qs.toString();
        return client.get<ApiResponse<PaginatedResponse<any>>>(`/api/outreach/dashboard/souls${query ? `?${query}` : ''}`);
      },
      followUpsOverview: (params?: { dateFrom?: string; dateTo?: string; programId?: string }) => {
        const qs = new URLSearchParams();
        if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
        if (params?.dateTo) qs.set('dateTo', params.dateTo);
        if (params?.programId) qs.set('programId', params.programId);
        const query = qs.toString();
        return client.get<ApiResponse<any>>(`/api/outreach/dashboard/follow-ups/overview${query ? `?${query}` : ''}`);
      },
      followUps: (params?: {
        ragStatus?: 'RED' | 'AMBER' | 'GREEN';
        page?: number;
        limit?: number;
        dateFrom?: string;
        dateTo?: string;
        programId?: string;
      }) => {
        const qs = new URLSearchParams();
        if (params?.ragStatus) qs.set('ragStatus', params.ragStatus);
        if (params?.page) qs.set('page', String(params.page));
        if (params?.limit) qs.set('limit', String(params.limit));
        if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
        if (params?.dateTo) qs.set('dateTo', params.dateTo);
        if (params?.programId) qs.set('programId', params.programId);
        const query = qs.toString();
        return client.get<ApiResponse<PaginatedResponse<any>>>(`/api/outreach/dashboard/follow-ups${query ? `?${query}` : ''}`);
      },
    },
    newBelievers: {
      health: (params?: { branchId?: string }) => {
        const qs = new URLSearchParams();
        if (params?.branchId) qs.set('branchId', params.branchId);
        const q = qs.toString();
        return client.get<ApiResponse<NewBelieverHealthSummary>>(`/api/new-believers/health${q ? `?${q}` : ''}`);
      },
      me: () => client.get<ApiResponse<NewBelieverHats>>('/api/new-believers/me'),
      enrollments: {
        list: (params?: EnrollmentListParams) => {
          const qs = new URLSearchParams();
          if (params?.branchId) qs.set('branchId', params.branchId);
          if (params?.stage) qs.set('stage', params.stage);
          if (params?.teacherId) qs.set('teacherId', params.teacherId);
          if (params?.stale) qs.set('stale', 'true');
          if (params?.sortBy) qs.set('sortBy', params.sortBy);
          if (params?.page) qs.set('page', String(params.page));
          if (params?.limit) qs.set('limit', String(params.limit));
          if (params?.mentorId) qs.set('mentorId', params.mentorId);
          const q = qs.toString();
          return client.get<ApiResponse<{ data: NewBelieverEnrollmentWithMember[]; total: number; page: number; limit: number }>>(`/api/new-believers/enrollments${q ? `?${q}` : ''}`);
        },
        bulkAdvance: (data: BulkAdvanceEnrollmentsRequest) =>
          client.post<ApiResponse<BulkAdvanceEnrollmentsResult>>('/api/new-believers/enrollments/bulk-advance', data),
        alerts: () =>
          client.get<ApiResponse<{ data: NewBelieverEnrollmentWithMember[]; total: number; page: number; limit: number }>>('/api/new-believers/enrollments/alerts'),
        get: (id: string) =>
          client.get<ApiResponse<NewBelieverEnrollmentWithMember>>(`/api/new-believers/enrollments/${id}`),
        create: (data: CreateEnrollmentRequest) =>
          client.post<ApiResponse<NewBelieverEnrollment>>('/api/new-believers/enrollments', data),
        update: (id: string, data: UpdateEnrollmentRequest) =>
          client.patch<ApiResponse<NewBelieverEnrollment>>(`/api/new-believers/enrollments/${id}`, data),
        listMentorFollowups: (enrollmentId: string) =>
          client.get<ApiResponse<MentorFollowupItem[]>>(`/api/new-believers/enrollments/${enrollmentId}/mentor-followups`),
        createMentorFollowup: (enrollmentId: string, data: CreateMentorFollowupRequest) =>
          client.post<ApiResponse<MentorFollowupItem>>(`/api/new-believers/enrollments/${enrollmentId}/mentor-followups`, data),
        deleteMentorFollowup: (followupId: string) =>
          client.delete<ApiResponse<{ id: string }>>(`/api/new-believers/mentor-followups/${followupId}`),
      },
      sessions: {
        list: (params?: SessionListParams) => {
          const qs = new URLSearchParams();
          if (params?.branchId) qs.set('branchId', params.branchId);
          if (params?.upcoming) qs.set('upcoming', 'true');
          const q = qs.toString();
          return client.get<ApiResponse<NewBelieverSession[]>>(`/api/new-believers/sessions${q ? `?${q}` : ''}`);
        },
        create: (data: CreateNewBelieverSessionRequest) =>
          client.post<ApiResponse<NewBelieverSession>>('/api/new-believers/sessions', data),
        update: (id: string, data: UpdateNewBelieverSessionRequest) =>
          client.patch<ApiResponse<NewBelieverSession>>(`/api/new-believers/sessions/${id}`, data),
        getAttendance: (sessionId: string) =>
          client.get<ApiResponse<NewBelieverAttendanceWithMember[]>>(`/api/new-believers/sessions/${sessionId}/attendance`),
        recordAttendance: (sessionId: string, data: RecordNewBelieverAttendanceRequest) =>
          client.post<ApiResponse<{ recorded: number }>>(`/api/new-believers/sessions/${sessionId}/attendance`, data),
      },
    },

    forms: {
      // Caller capabilities — drives /forms landing + filter gating.
      myCapabilities: () =>
        client.get<ApiResponse<FormsCapabilities>>('/api/forms/me/capabilities'),

      // Submit a form (any logged-in member). Branch is forced server-side.
      submit: (formType: FormType, data: SubmitFormRequest) =>
        client.post<ApiResponse<FormSubmission>>(`/api/forms/${encodeURIComponent(formType)}/submit`, data),

      // Typeahead for the altar-call search-and-select.
      memberSearch: (params: FormMemberSearchParams) => {
        const qs = new URLSearchParams();
        qs.set('q', params.q);
        if (params.branchId) qs.set('branchId', params.branchId);
        return client.get<ApiResponse<FormMemberSearchResult[]>>(`/api/forms/member-search?${qs.toString()}`);
      },

      submissions: {
        list: (params?: ListFormSubmissionsParams) => {
          const qs = new URLSearchParams();
          if (params?.branchId) qs.set('branchId', params.branchId);
          if (params?.formType) qs.set('formType', params.formType);
          if (params?.status) qs.set('status', params.status);
          if (params?.from) qs.set('from', params.from);
          if (params?.to) qs.set('to', params.to);
          const q = qs.toString();
          return client.get<ApiResponse<FormSubmission[]>>(`/api/forms/submissions${q ? `?${q}` : ''}`);
        },
        get: (id: string) =>
          client.get<ApiResponse<FormSubmission>>(`/api/forms/submissions/${encodeURIComponent(id)}`),
        update: (id: string, data: UpdateFormSubmissionRequest) =>
          client.patch<ApiResponse<FormSubmission>>(`/api/forms/submissions/${encodeURIComponent(id)}`, data),
        exportCsv: (params: ExportFormSubmissionsParams) => {
          const qs = new URLSearchParams();
          qs.set('formType', params.formType);
          if (params.branchId) qs.set('branchId', params.branchId);
          if (params.status) qs.set('status', params.status);
          if (params.from) qs.set('from', params.from);
          if (params.to) qs.set('to', params.to);
          return client.getBlob(`/api/forms/submissions/export?${qs.toString()}`);
        },
      },

      attendees: {
        dormant: (params?: ListDormantAttendeesParams) => {
          const qs = new URLSearchParams();
          if (params?.branchId) qs.set('branchId', params.branchId);
          const q = qs.toString();
          return client.get<ApiResponse<DormantAttendee[]>>(`/api/forms/attendees/dormant${q ? `?${q}` : ''}`);
        },
        archive: (data: ArchiveAttendeesRequest) =>
          client.post<ApiResponse<ArchiveAttendeesResult>>('/api/forms/attendees/archive', data),
      },

      visitors: {
        dormant: (params?: ListDormantVisitorsParams) => {
          const qs = new URLSearchParams();
          if (params?.branchId) qs.set('branchId', params.branchId);
          const q = qs.toString();
          return client.get<ApiResponse<DormantVisitor[]>>(`/api/forms/visitors/dormant${q ? `?${q}` : ''}`);
        },
        // Archive payload + result shapes mirror attendees one-to-one.
        archive: (data: ArchiveAttendeesRequest) =>
          client.post<ApiResponse<ArchiveAttendeesResult>>('/api/forms/visitors/archive', data),
      },
    },

    attendance: {
      listServices: (params?: ServiceListParams) => {
        const qs = new URLSearchParams();
        if (params?.page) qs.set('page', String(params.page));
        if (params?.limit) qs.set('limit', String(params.limit));
        if (params?.branchId) qs.set('branchId', params.branchId);
        if (params?.type) qs.set('type', params.type);
        if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
        if (params?.dateTo) qs.set('dateTo', params.dateTo);
        const query = qs.toString();
        return client.get<ApiResponse<PaginatedResponse<ServiceSummary>>>(`/api/attendance/services${query ? `?${query}` : ''}`);
      },
      getService: (id: string) =>
        client.get<ApiResponse<ServiceWithDetail>>(`/api/attendance/services/${encodeURIComponent(id)}`),
      createService: (data: CreateServiceRequest) =>
        client.post<ApiResponse<ServiceSummary>>('/api/attendance/services', data),
      updateService: (id: string, data: UpdateServiceRequest) =>
        client.patch<ApiResponse<ServiceSummary>>(`/api/attendance/services/${encodeURIComponent(id)}`, data),
      deleteService: (id: string) =>
        client.delete<ApiResponse<ServiceSummary>>(`/api/attendance/services/${encodeURIComponent(id)}`),

      roster: (serviceId: string, params?: RosterParams) => {
        const qs = new URLSearchParams();
        if (params?.page) qs.set('page', String(params.page));
        if (params?.limit) qs.set('limit', String(params.limit));
        if (params?.search) qs.set('search', params.search);
        const query = qs.toString();
        return client.get<ApiResponse<PaginatedResponse<RosterEntry>>>(`/api/attendance/services/${encodeURIComponent(serviceId)}/roster${query ? `?${query}` : ''}`);
      },
      recordAttendance: (serviceId: string, data: RecordServiceAttendanceRequest) =>
        client.post<ApiResponse<RecordAttendanceResult>>(`/api/attendance/services/${encodeURIComponent(serviceId)}/records`, data),
      listAttendance: (serviceId: string) =>
        client.get<ApiResponse<ServiceAttendanceRow[]>>(`/api/attendance/services/${encodeURIComponent(serviceId)}/records`),

      trends: (params?: AttendanceTrendsParams) => {
        const qs = new URLSearchParams();
        if (params?.branchId) qs.set('branchId', params.branchId);
        if (params?.weeks) qs.set('weeks', String(params.weeks));
        if (params?.departmentId) qs.set('departmentId', params.departmentId);
        if (params?.fellowshipId) qs.set('fellowshipId', params.fellowshipId);
        const query = qs.toString();
        return client.get<ApiResponse<AttendanceTrendPoint[]>>(`/api/attendance/reports/trends${query ? `?${query}` : ''}`);
      },
      missingMembers: (params?: MissingMembersParams) => {
        const qs = new URLSearchParams();
        if (params?.branchId) qs.set('branchId', params.branchId);
        if (params?.services) qs.set('services', String(params.services));
        if (params?.departmentId) qs.set('departmentId', params.departmentId);
        if (params?.fellowshipId) qs.set('fellowshipId', params.fellowshipId);
        const query = qs.toString();
        return client.get<ApiResponse<MissingMember[]>>(`/api/attendance/reports/missing-members${query ? `?${query}` : ''}`);
      },
      byBranch: (params?: BranchAttendanceParams) => {
        const qs = new URLSearchParams();
        if (params?.branchId) qs.set('branchId', params.branchId);
        if (params?.weeks) qs.set('weeks', String(params.weeks));
        const query = qs.toString();
        return client.get<ApiResponse<BranchAttendanceRate[]>>(`/api/attendance/reports/by-branch${query ? `?${query}` : ''}`);
      },
      summary: (params?: AttendanceSummaryParams) => {
        const qs = new URLSearchParams();
        if (params?.branchId) qs.set('branchId', params.branchId);
        if (params?.weeks) qs.set('weeks', String(params.weeks));
        if (params?.departmentId) qs.set('departmentId', params.departmentId);
        if (params?.fellowshipId) qs.set('fellowshipId', params.fellowshipId);
        const query = qs.toString();
        return client.get<ApiResponse<AttendanceSummary>>(`/api/attendance/reports/summary${query ? `?${query}` : ''}`);
      },
      canRecord: (params?: { branchId?: string }) => {
        const qs = new URLSearchParams();
        if (params?.branchId) qs.set('branchId', params.branchId);
        const query = qs.toString();
        return client.get<ApiResponse<{ canRecord: boolean }>>(`/api/attendance/me/can-record${query ? `?${query}` : ''}`);
      },
      cohortDiff: (body: CohortDiffRequest) =>
        client.post<ApiResponse<CohortDiffResult>>('/api/attendance/reports/cohort-diff', body),
      mine: (params?: { weeks?: number }) => {
        const qs = new URLSearchParams();
        if (params?.weeks) qs.set('weeks', String(params.weeks));
        const query = qs.toString();
        return client.get<ApiResponse<MyAttendanceSnapshot>>(`/api/attendance/me${query ? `?${query}` : ''}`);
      },
      departmentReport: (branchDeptId: string, params?: { weeks?: number }) => {
        const qs = new URLSearchParams();
        if (params?.weeks) qs.set('weeks', String(params.weeks));
        const query = qs.toString();
        return client.get<ApiResponse<DepartmentAttendanceReport>>(
          `/api/attendance/reports/department/${encodeURIComponent(branchDeptId)}${query ? `?${query}` : ''}`,
        );
      },
      fellowshipReport: (fellowshipId: string, params?: { weeks?: number }) => {
        const qs = new URLSearchParams();
        if (params?.weeks) qs.set('weeks', String(params.weeks));
        const query = qs.toString();
        return client.get<ApiResponse<FellowshipAttendanceReport>>(
          `/api/attendance/reports/fellowship/${encodeURIComponent(fellowshipId)}${query ? `?${query}` : ''}`,
        );
      },
    },
  };
}

export type KairosApi = ReturnType<typeof createApiClient>;

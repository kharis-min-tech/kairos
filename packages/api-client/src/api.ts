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
  CreateFellowshipRequest,
  UpdateFellowshipRequest,
  CreateFellowshipMeetingRequest,
  RecordAttendanceRequest,
  FellowshipListParams,
  AddFellowshipMemberRequest,
  CreateJoinRequestRequest,
  ReviewJoinRequestRequest,
  PaginatedResponse,
  AdminDashboardStats,
  BranchDashboardStats,
  MemberDashboardStats,
  CreateMemberRequest,
  CreateMemberResponse,
  ChangePasswordRequest,
  ReportsMemberGrowth,
  ReportsAttendanceTrend,
  ReportsFellowshipActivity,
  SwitchActiveBranchResponse,
  CreateEnrollmentRequest,
  UpdateEnrollmentRequest,
  EnrollmentListParams,
  CreateNewBelieverSessionRequest,
  RecordNewBelieverAttendanceRequest,
  SessionListParams,
} from '@kairos/types';

import type {
  Branch,
  BranchWithRegion,
  Region,
  BranchLeadershipWithMember,
  Member,
  MemberWithBranch,
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
  NewBelieverEnrollment,
  NewBelieverEnrollmentWithMember,
  NewBelieverSession,
  NewBelieverAttendanceWithMember,
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
      list: (params?: { limit?: number; isActive?: boolean }) => {
        const qs = params ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString() : '';
        return client.get<ApiResponse<BranchWithRegion[]>>(`/api/branches${qs ? `?${qs}` : ''}`);
      },
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
        return client.get<ApiResponse<PaginatedResponse<MemberWithBranch>>>(`/api/members${query ? `?${query}` : ''}`);
      },
      get: (id: string) =>
        client.get<ApiResponse<Member>>(`/api/members/${encodeURIComponent(id)}`),
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
      stats: (id: string) =>
        client.get<ApiResponse<MemberDashboardStats>>(`/api/members/${encodeURIComponent(id)}/stats`),
      me: () =>
        client.get<ApiResponse<Member>>('/api/members/me'),
      switchActiveBranch: (id: string) =>
        client.patch<ApiResponse<SwitchActiveBranchResponse>>(`/api/members/${encodeURIComponent(id)}/active-branch`, {}),
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
      get: (id: string) =>
        client.get<ApiResponse<FellowshipWithBranch>>(`/api/fellowships/${encodeURIComponent(id)}`),
      create: (data: CreateFellowshipRequest) =>
        client.post<ApiResponse<Fellowship>>('/api/fellowships', data),
      update: (id: string, data: UpdateFellowshipRequest) =>
        client.patch<ApiResponse<Fellowship>>(`/api/fellowships/${encodeURIComponent(id)}`, data),
      delete: (id: string) =>
        client.delete<ApiResponse<void>>(`/api/fellowships/${encodeURIComponent(id)}`),
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
    },

    analytics: {
      adminStats: () =>
        client.get<ApiResponse<AdminDashboardStats>>('/api/analytics/admin'),
      branchStats: () =>
        client.get<ApiResponse<BranchDashboardStats>>('/api/analytics/branch'),
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
    newBelievers: {
      enrollments: {
        list: (params?: EnrollmentListParams) => {
          const qs = new URLSearchParams();
          if (params?.branchId) qs.set('branchId', params.branchId);
          if (params?.stage) qs.set('stage', params.stage);
          if (params?.teacherId) qs.set('teacherId', params.teacherId);
          if (params?.stale) qs.set('stale', 'true');
          if (params?.page) qs.set('page', String(params.page));
          if (params?.limit) qs.set('limit', String(params.limit));
          const q = qs.toString();
          return client.get<ApiResponse<{ data: NewBelieverEnrollmentWithMember[]; total: number; page: number; limit: number }>>(`/api/new-believers/enrollments${q ? `?${q}` : ''}`);
        },
        alerts: () =>
          client.get<ApiResponse<{ data: NewBelieverEnrollmentWithMember[]; total: number; page: number; limit: number }>>('/api/new-believers/enrollments/alerts'),
        get: (id: string) =>
          client.get<ApiResponse<NewBelieverEnrollmentWithMember>>(`/api/new-believers/enrollments/${id}`),
        create: (data: CreateEnrollmentRequest) =>
          client.post<ApiResponse<NewBelieverEnrollment>>('/api/new-believers/enrollments', data),
        update: (id: string, data: UpdateEnrollmentRequest) =>
          client.patch<ApiResponse<NewBelieverEnrollment>>(`/api/new-believers/enrollments/${id}`, data),
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
        getAttendance: (sessionId: string) =>
          client.get<ApiResponse<NewBelieverAttendanceWithMember[]>>(`/api/new-believers/sessions/${sessionId}/attendance`),
        recordAttendance: (sessionId: string, data: RecordNewBelieverAttendanceRequest) =>
          client.post<ApiResponse<{ count: number }>>(`/api/new-believers/sessions/${sessionId}/attendance`, data),
      },
    },
    departments: {
      list: (params?: { branchId?: string }) => {
        const qs = params?.branchId ? `?branchId=${encodeURIComponent(params.branchId)}` : '';
        return client.get<ApiResponse<{ id: string; branchId: string; departmentId: string; departmentName: string; description: string | null }[]>>(`/api/departments${qs}`);
      },
    },
  };
}

export type KairosApi = ReturnType<typeof createApiClient>;

// Singleton instance for browser/Next.js environments
let instance: KairosApi | null = null;

export function configureClient(options: {
  baseUrl: string;
  getToken?: () => string | null;
  getRefreshToken?: () => string | null;
  onTokenRefreshed?: (accessToken: string, refreshToken: string) => void;
  onAuthFailure?: () => void;
}): KairosApi {
  instance = createApiClient(
    options.baseUrl,
    options.getToken,
    {
      getRefreshToken: options.getRefreshToken,
      onTokenRefreshed: options.onTokenRefreshed,
      onAuthFailure: options.onAuthFailure,
    },
  );
  return instance;
}

export function getApiInstance(): KairosApi {
  if (!instance) {
    throw new Error(
      'API client not configured. Call configureClient() first or provide a baseUrl.',
    );
  }
  return instance;
}

// Export convenience shortcuts for the singleton instance
export const members = {
  get list() { return getApiInstance().members.list; },
  get get() { return getApiInstance().members.get; },
  get update() { return getApiInstance().members.update; },
  get approve() { return getApiInstance().members.approve; },
  get deactivate() { return getApiInstance().members.deactivate; },
  /** Alias for deactivate — soft-deletes a member */
  get delete() { return getApiInstance().members.deactivate; },
  get create() { return getApiInstance().members.create; },
  get importCsv() { return getApiInstance().members.importCsv; },
  get exportCsv() { return getApiInstance().members.exportCsv; },
  get reactivate() { return getApiInstance().members.reactivate; },
  get stats() { return getApiInstance().members.stats; },
  get me() { return getApiInstance().members.me; },
  get switchActiveBranch() { return getApiInstance().members.switchActiveBranch; },
  get roles() { return getApiInstance().members.roles; },
};

export const branches = {
  get listPublic() { return getApiInstance().branches.listPublic; },
  get list() { return getApiInstance().branches.list; },
  get get() { return getApiInstance().branches.get; },
  get create() { return getApiInstance().branches.create; },
  get update() { return getApiInstance().branches.update; },
  get delete() { return getApiInstance().branches.delete; },
};

export const regions = {
  get list() { return getApiInstance().regions.list; },
  get create() { return getApiInstance().regions.create; },
};

export const leadership = {
  get list() { return getApiInstance().leadership.list; },
  get assign() { return getApiInstance().leadership.assign; },
  get remove() { return getApiInstance().leadership.remove; },
};

export const fellowships = {
  get list() { return getApiInstance().fellowships.list; },
  get get() { return getApiInstance().fellowships.get; },
  get create() { return getApiInstance().fellowships.create; },
  get update() { return getApiInstance().fellowships.update; },
  get delete() { return getApiInstance().fellowships.delete; },
  get members() { return getApiInstance().fellowships.members; },
  get joinRequests() { return getApiInstance().fellowships.joinRequests; },
  get meetings() { return getApiInstance().fellowships.meetings; },
  get attendance() { return getApiInstance().fellowships.attendance; },
  sendMessage: (_fellowshipId: string, _data: Record<string, unknown>) =>
    Promise.resolve({ success: true, data: null as unknown, message: 'Not implemented' }),
};

export const analytics = {
  get adminStats() { return getApiInstance().analytics.adminStats; },
  get branchStats() { return getApiInstance().analytics.branchStats; },
  get memberStats() { return getApiInstance().analytics.memberStats; },
};

export const reports = {
  get memberGrowth() { return getApiInstance().reports.memberGrowth; },
  get attendanceTrend() { return getApiInstance().reports.attendanceTrend; },
  get fellowshipActivity() { return getApiInstance().reports.fellowshipActivity; },
};

export const newBelievers = {
  get enrollments() { return getApiInstance().newBelievers.enrollments; },
  get sessions() { return getApiInstance().newBelievers.sessions; },
};

// Dashboard convenience exports
export interface LeaderDashboard { followUpMembers: unknown[]; joinRequests: unknown[]; recentAttendance: unknown[]; stats: Record<string, number>; }
export interface PastorDashboard { overdueFollowUps: unknown[]; memberGrowth: unknown[]; stats: Record<string, number>; }
export interface AdminDashboard { stats: Record<string, number>; recentActivity: unknown[]; }

export const dashboard = {
  getLeader: () =>
    Promise.resolve(null as unknown as LeaderDashboard),
  getPastor: () =>
    Promise.resolve(null as unknown as PastorDashboard),
  getAdmin: () =>
    Promise.resolve(null as unknown as AdminDashboard),
};

// Convenience export for top-level attendance access (delegates to fellowships.attendance)
export const attendance = {
  get record() { return getApiInstance().fellowships.attendance.record; },
  get get() { return getApiInstance().fellowships.attendance.get; },
  get summary() { return getApiInstance().fellowships.attendance.summary; },
  // Stub methods for service and fellowship attendance recording
  recordService: (_data: Record<string, unknown>) =>
    Promise.resolve({ success: true, data: null as unknown, message: 'Not implemented' } as ApiResponse<unknown>),
  recordFellowship: (_data: Record<string, unknown>) =>
    Promise.resolve({ success: true, data: null as unknown, message: 'Not implemented' } as ApiResponse<unknown>),
  // Stub methods for attendance reports/trends
  getTrends: (_params?: Record<string, unknown>) =>
    Promise.resolve({ success: true, data: [], message: 'Not implemented' } as ApiResponse<unknown[]>),
  getMissingMembers: (_params?: Record<string, unknown>) =>
    Promise.resolve({ success: true, data: [], message: 'Not implemented' } as ApiResponse<unknown[]>),
  // Stub method for export
  export: (_params?: Record<string, unknown>) =>
    Promise.resolve({ success: true, data: { url: null }, message: 'Not implemented' } as ApiResponse<{ url: string | null }>),
};

// Outreach programs API convenience exports
export const outreach = {
  createProgram: (_data: Record<string, unknown>) => stubOne(),
  listPrograms: (_params?: Record<string, string>) => stubList(),
  getProgram: (_outreachId: string) => stubOne(),
  completeProgram: (_outreachId: string, _data?: Record<string, unknown>) => stubOne(),
  registerWorker: (_outreachId: string, _data: Record<string, unknown>) => stubOne(),
  overrideBranch: (_data: Record<string, unknown>) => stubOne(),
};

// Souls API convenience exports
export const souls = {
  create: (_data: Record<string, unknown>) => stubOne(),
  list: (_params?: Record<string, string>) => stubList(),
  get: (_soulId: string) => stubOne(),
  addFollowup: (_soulId: string, _data: Record<string, unknown>) => stubOne(),
  updateStatus: (_soulId: string, _data: Record<string, unknown>) => stubOne(),
  getAlerts: (_params?: Record<string, string>) => stubList(),
  getConversionFunnel: (_outreachId: string) => stubOne(),
  getFollowUpTracker: (_params?: Record<string, string>) => stubList(),
};

// ── Stub modules for pages that reference not-yet-implemented API endpoints ──
// These will be replaced with proper implementations backed by Hono routers.

const stubList = (): Promise<ApiResponse<unknown[]>> =>
  Promise.resolve({ success: true, data: [], message: 'Not implemented' });

const stubOne = (): Promise<ApiResponse<unknown>> =>
  Promise.resolve({ success: true, data: null as unknown, message: 'Not implemented' });

export const departments = {
  list: (_params?: Record<string, unknown>) => stubList(),
};

export const donations = {
  list: (_params?: Record<string, unknown>) => stubList(),
  export: (_params?: Record<string, unknown>) => stubOne(),
  getReports: (_params?: Record<string, unknown>) => stubOne(),
  createOnline: (_data: Record<string, unknown>) => stubOne(),
  createManual: (_data: Record<string, unknown>) => stubOne(),
};

export const forms = {
  list: (_params?: Record<string, unknown>) => stubList(),
  get: (_id: number | string) => stubOne(),
  create: (_data: Record<string, unknown>) => stubOne(),
  submit: (_id: number | string, _data: Record<string, unknown>) => stubOne(),
  saveTemplate: (_data: Record<string, unknown>) => stubOne(),
  listTemplates: () => stubList(),
  listSubmissions: (_params?: Record<string, unknown>) => stubList(),
  exportSubmissions: (_params?: Record<string, unknown>) => stubOne(),
};

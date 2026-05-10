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
      reports: {
        conversionFunnel: (params?: {
          branchId?: string;
          outreachId?: string;
          startDate?: string;
          endDate?: string;
        }) => {
          const qs = new URLSearchParams();
          if (params?.branchId) qs.set('branchId', params.branchId);
          if (params?.outreachId) qs.set('outreachId', params.outreachId);
          if (params?.startDate) qs.set('startDate', params.startDate);
          if (params?.endDate) qs.set('endDate', params.endDate);
          const query = qs.toString();
          return client.get<ApiResponse<any>>(`/api/outreach/reports/conversion-funnel${query ? `?${query}` : ''}`);
        },
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
      update: (id: string, data: any) =>
        client.put<ApiResponse<any>>(`/api/souls/${encodeURIComponent(id)}`, data),
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

    attendance: {
      services: {
        list: (params?: {
          page?: number;
          limit?: number;
          branchId?: string;
          serviceType?: string;
          startDate?: string;
          endDate?: string;
        }) => {
          const qs = new URLSearchParams();
          if (params?.page) qs.set('page', String(params.page));
          if (params?.limit) qs.set('limit', String(params.limit));
          if (params?.branchId) qs.set('branchId', params.branchId);
          if (params?.serviceType) qs.set('serviceType', params.serviceType);
          if (params?.startDate) qs.set('startDate', params.startDate);
          if (params?.endDate) qs.set('endDate', params.endDate);
          const query = qs.toString();
          return client.get<ApiResponse<PaginatedResponse<any>>>(`/api/attendance/services${query ? `?${query}` : ''}`);
        },
        get: (id: string) =>
          client.get<ApiResponse<any>>(`/api/attendance/services/${encodeURIComponent(id)}`),
        create: (data: any) =>
          client.post<ApiResponse<any>>('/api/attendance/services', data),
        update: (id: string, data: any) =>
          client.patch<ApiResponse<any>>(`/api/attendance/services/${encodeURIComponent(id)}`, data),
        delete: (id: string) =>
          client.delete<ApiResponse<any>>(`/api/attendance/services/${encodeURIComponent(id)}`),
        restore: (id: string) =>
          client.post<ApiResponse<any>>(`/api/attendance/services/${encodeURIComponent(id)}/restore`, {}),
        listDeleted: () =>
          client.get<ApiResponse<any[]>>('/api/attendance/services/deleted'),
        listOtherBranches: () =>
          client.get<ApiResponse<any[]>>('/api/attendance/services/other-branches'),
        getAttendance: (serviceId: string) =>
          client.get<ApiResponse<any[]>>(`/api/attendance/services/${encodeURIComponent(serviceId)}/attendance`),
        recordAttendance: (serviceId: string, data: { records: any[] }) =>
          client.post<ApiResponse<{ recorded: number }>>(`/api/attendance/services/${encodeURIComponent(serviceId)}/attendance`, data),
        updateAttendance: (serviceId: string, memberId: string, data: any) =>
          client.patch<ApiResponse<any>>(`/api/attendance/services/${encodeURIComponent(serviceId)}/attendance/${encodeURIComponent(memberId)}`, data),
        deleteAttendance: (serviceId: string, memberId: string) =>
          client.delete<ApiResponse<any>>(`/api/attendance/services/${encodeURIComponent(serviceId)}/attendance/${encodeURIComponent(memberId)}`),
      },
      reports: {
        trends: (params?: { branchId?: string; weeks?: number }) => {
          const qs = new URLSearchParams();
          if (params?.branchId) qs.set('branchId', params.branchId);
          if (params?.weeks) qs.set('weeks', String(params.weeks));
          const query = qs.toString();
          return client.get<ApiResponse<any[]>>(`/api/attendance/reports/trends${query ? `?${query}` : ''}`);
        },
        detailedTrends: (params?: { branchId?: string; weeks?: number }) => {
          const qs = new URLSearchParams();
          if (params?.branchId) qs.set('branchId', params.branchId);
          if (params?.weeks) qs.set('weeks', String(params.weeks));
          const query = qs.toString();
          return client.get<ApiResponse<any[]>>(`/api/attendance/reports/detailed-trends${query ? `?${query}` : ''}`);
        },
        byBranch: (params?: { startDate?: string; endDate?: string }) => {
          const qs = new URLSearchParams();
          if (params?.startDate) qs.set('startDate', params.startDate);
          if (params?.endDate) qs.set('endDate', params.endDate);
          const query = qs.toString();
          return client.get<ApiResponse<any[]>>(`/api/attendance/reports/by-branch${query ? `?${query}` : ''}`);
        },
        firstTimeVisitors: (params?: { branchId?: string; startDate?: string; endDate?: string }) => {
          const qs = new URLSearchParams();
          if (params?.branchId) qs.set('branchId', params.branchId);
          if (params?.startDate) qs.set('startDate', params.startDate);
          if (params?.endDate) qs.set('endDate', params.endDate);
          const query = qs.toString();
          return client.get<ApiResponse<any[]>>(`/api/attendance/reports/first-time-visitors${query ? `?${query}` : ''}`);
        },
        missingMembers: (params?: { branchId?: string; weeks?: number }) => {
          const qs = new URLSearchParams();
          if (params?.branchId) qs.set('branchId', params.branchId);
          if (params?.weeks) qs.set('weeks', String(params.weeks));
          const query = qs.toString();
          return client.get<ApiResponse<any[]>>(`/api/attendance/reports/missing-members${query ? `?${query}` : ''}`);
        },
        byServiceType: (params?: { branchId?: string; weeks?: number }) => {
          const qs = new URLSearchParams();
          if (params?.branchId) qs.set('branchId', params.branchId);
          if (params?.weeks) qs.set('weeks', String(params.weeks));
          const query = qs.toString();
          return client.get<ApiResponse<any[]>>(`/api/attendance/reports/by-service-type${query ? `?${query}` : ''}`);
        },
        crossBranchVisits: (params?: { branchId?: string; weeks?: number; startDate?: string; endDate?: string }) => {
          const qs = new URLSearchParams();
          if (params?.branchId) qs.set('branchId', params.branchId);
          if (params?.weeks) qs.set('weeks', String(params.weeks));
          if (params?.startDate) qs.set('startDate', params.startDate);
          if (params?.endDate) qs.set('endDate', params.endDate);
          const query = qs.toString();
          return client.get<ApiResponse<any[]>>(`/api/attendance/reports/cross-branch-visits${query ? `?${query}` : ''}`);
        },
      },
      memberHistory: (memberId: string, params?: { startDate?: string; endDate?: string; limit?: number }) => {
        const qs = new URLSearchParams();
        if (params?.startDate) qs.set('startDate', params.startDate);
        if (params?.endDate) qs.set('endDate', params.endDate);
        if (params?.limit) qs.set('limit', String(params.limit));
        const query = qs.toString();
        return client.get<ApiResponse<any[]>>(`/api/attendance/members/${encodeURIComponent(memberId)}/history${query ? `?${query}` : ''}`);
      },
      selfCheckIn: (serviceId: string, data?: { attendanceStatus?: 'Present' | 'Virtual' | 'Late'; arrivalTime?: string }) =>
        client.post<ApiResponse<any>>(`/api/attendance/services/${encodeURIComponent(serviceId)}/check-in`, data || {}),
      getMyStatus: (serviceId: string) =>
        client.get<ApiResponse<any>>(`/api/attendance/services/${encodeURIComponent(serviceId)}/my-status`),
    },

    dashboard: {
      overview: () =>
        client.get<ApiResponse<any>>('/api/outreach/dashboard/overview'),
      analytics: () =>
        client.get<ApiResponse<any>>('/api/outreach/dashboard/analytics'),
      souls: (params?: {
        ragStatus?: 'RED' | 'AMBER' | 'GREEN';
        status?: string;
        page?: number;
        limit?: number;
      }) => {
        const qs = new URLSearchParams();
        if (params?.ragStatus) qs.set('ragStatus', params.ragStatus);
        if (params?.status) qs.set('status', params.status);
        if (params?.page) qs.set('page', String(params.page));
        if (params?.limit) qs.set('limit', String(params.limit));
        const query = qs.toString();
        return client.get<ApiResponse<PaginatedResponse<any>>>(`/api/outreach/dashboard/souls${query ? `?${query}` : ''}`);
      },
      followUpsOverview: () =>
        client.get<ApiResponse<any>>('/api/outreach/dashboard/follow-ups/overview'),
      followUps: (params?: {
        ragStatus?: 'RED' | 'AMBER' | 'GREEN';
        page?: number;
        limit?: number;
      }) => {
        const qs = new URLSearchParams();
        if (params?.ragStatus) qs.set('ragStatus', params.ragStatus);
        if (params?.page) qs.set('page', String(params.page));
        if (params?.limit) qs.set('limit', String(params.limit));
        const query = qs.toString();
        return client.get<ApiResponse<PaginatedResponse<any>>>(`/api/outreach/dashboard/follow-ups${query ? `?${query}` : ''}`);
      },
    },
  };
}

export type KairosApi = ReturnType<typeof createApiClient>;

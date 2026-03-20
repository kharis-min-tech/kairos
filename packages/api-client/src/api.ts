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
      list: (branchId: string) =>
        client.get<ApiResponse<BranchLeadershipWithMember[]>>(`/api/branches/${encodeURIComponent(branchId)}/leadership`),
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
      reactivate: (id: string) =>
        client.post<ApiResponse<Member>>(`/api/members/${encodeURIComponent(id)}/reactivate`, {}),
      stats: (id: string) =>
        client.get<ApiResponse<MemberDashboardStats>>(`/api/members/${encodeURIComponent(id)}/stats`),
      me: () =>
        client.get<ApiResponse<Member>>('/api/members/me'),
      roles: {
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
  };
}

export type KairosApi = ReturnType<typeof createApiClient>;

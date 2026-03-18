import type {
  ApiResponse,
  AuthTokens,
  LoginRequest,
  LoginResponse,
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
  CreateFellowshipRequest,
  UpdateFellowshipRequest,
  CreateFellowshipMeetingRequest,
  RecordAttendanceRequest,
  PaginatedResponse,
} from '@kairos/types';

import type {
  Branch,
  BranchWithRegion,
  Region,
  BranchLeadershipWithMember,
  Member,
  Fellowship,
  FellowshipMeeting,
} from '@kairos/types';

import { ApiClient } from './client';

export function createApiClient(baseUrl: string, getToken?: () => string | null) {
  const client = new ApiClient({ baseUrl, getToken });

  return {
    auth: {
      signup: (data: SignupRequest) =>
        client.post<ApiResponse<{ memberId: string }>>('/api/auth/signup', data),
      login: (data: LoginRequest) =>
        client.post<ApiResponse<LoginResponse>>('/api/auth/login', data),
      refresh: (data: RefreshRequest) =>
        client.post<ApiResponse<AuthTokens>>('/api/auth/refresh', data),
      verifyEmail: (data: VerifyEmailRequest) =>
        client.post<ApiResponse<void>>('/api/auth/verify-email', data),
      forgotPassword: (data: ForgotPasswordRequest) =>
        client.post<ApiResponse<void>>('/api/auth/forgot-password', data),
      resetPassword: (data: ResetPasswordRequest) =>
        client.post<ApiResponse<void>>('/api/auth/reset-password', data),
    },

    branches: {
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
      list: (params?: { page?: number; limit?: number }) => {
        const qs = params ? `?page=${params.page ?? 1}&limit=${params.limit ?? 20}` : '';
        return client.get<PaginatedResponse<Member>>(`/api/members${qs}`);
      },
      get: (id: string) =>
        client.get<ApiResponse<Member>>(`/api/members/${encodeURIComponent(id)}`),
      update: (id: string, data: UpdateMemberRequest) =>
        client.patch<ApiResponse<Member>>(`/api/members/${encodeURIComponent(id)}`, data),
      approve: (id: string, data: ApproveMemberRequest) =>
        client.post<ApiResponse<Member>>(`/api/members/${encodeURIComponent(id)}/approve`, data),
      me: () =>
        client.get<ApiResponse<Member>>('/api/members/me'),
    },

    fellowships: {
      list: () =>
        client.get<ApiResponse<Fellowship[]>>('/api/fellowships'),
      get: (id: string) =>
        client.get<ApiResponse<Fellowship>>(`/api/fellowships/${encodeURIComponent(id)}`),
      create: (data: CreateFellowshipRequest) =>
        client.post<ApiResponse<Fellowship>>('/api/fellowships', data),
      update: (id: string, data: UpdateFellowshipRequest) =>
        client.patch<ApiResponse<Fellowship>>(`/api/fellowships/${encodeURIComponent(id)}`, data),
      delete: (id: string) =>
        client.delete<ApiResponse<void>>(`/api/fellowships/${encodeURIComponent(id)}`),
      meetings: {
        list: (fellowshipId: string) =>
          client.get<ApiResponse<FellowshipMeeting[]>>(`/api/fellowships/${encodeURIComponent(fellowshipId)}/meetings`),
        create: (fellowshipId: string, data: CreateFellowshipMeetingRequest) =>
          client.post<ApiResponse<FellowshipMeeting>>(`/api/fellowships/${encodeURIComponent(fellowshipId)}/meetings`, data),
      },
      attendance: {
        record: (meetingId: string, data: RecordAttendanceRequest) =>
          client.post<ApiResponse<void>>(`/api/fellowships/meetings/${encodeURIComponent(meetingId)}/attendance`, data),
      },
    },
  };
}

export type KairosApi = ReturnType<typeof createApiClient>;

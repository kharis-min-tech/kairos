// Type-safe API methods for all Kairos backend endpoints

import { get, post, put, del } from './client';
import type {
  Member,
  Branch,
  Department,
  BranchDepartment,
  Fellowship,
  Service,
  ServiceAttendance,
  OutreachProgram,
  Soul,
  FollowUp,
  Donation,
  Form,
  FormSubmission,
  Notification,
  NotificationRecipient,
} from '@kairos/types';
import type { PaginatedResponse } from '@kairos/types';

// ─── Query helpers ───────────────────────────────────────────────

type ListParams = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: string | number | boolean | undefined;
};

// ─── Members ─────────────────────────────────────────────────────

export const members = {
  create: (data: Partial<Member>) =>
    post<Member>('/v1/members', data),

  list: (params?: ListParams) =>
    get<PaginatedResponse<Member>>('/v1/members', params),

  get: (id: number) =>
    get<Member>(`/v1/members/${id}`),

  update: (id: number, data: Partial<Member>) =>
    put<Member>(`/v1/members/${id}`, data),

  delete: (id: number) =>
    del(`/v1/members/${id}`),

  approve: (id: number) =>
    post<Member>(`/v1/members/${id}/approve`),

  import: (data: { file: string; branchId: number }) =>
    post<{ created: number; errors: Array<{ row: number; field: string; message: string }> }>(
      '/v1/members/import',
      data
    ),

  export: (params?: ListParams) =>
    get<{ url: string }>('/v1/members/export', params),
};

// ─── Branches ────────────────────────────────────────────────────

export const branches = {
  create: (data: Partial<Branch>) =>
    post<Branch>('/v1/branches', data),

  list: (params?: ListParams) =>
    get<PaginatedResponse<Branch>>('/v1/branches', params),

  get: (id: number) =>
    get<Branch>(`/v1/branches/${id}`),

  update: (id: number, data: Partial<Branch>) =>
    put<Branch>(`/v1/branches/${id}`, data),

  delete: (id: number) =>
    del(`/v1/branches/${id}`),

  assignPastor: (id: number, data: { memberId: number }) =>
    post<void>(`/v1/branches/${id}/assign-pastor`, data),

  assignElder: (id: number, data: { memberId: number }) =>
    post<void>(`/v1/branches/${id}/assign-elder`, data),
};

// ─── Departments ─────────────────────────────────────────────────

export const departments = {
  create: (data: Partial<Department> & { branchId?: number; leadMemberId?: number; deputyMemberId?: number }) =>
    post<BranchDepartment>('/v1/departments', data),

  list: (params?: ListParams) =>
    get<PaginatedResponse<BranchDepartment>>('/v1/departments', params),

  assignMember: (id: number, data: { memberId: number; adminOverride?: boolean }) =>
    post<void>(`/v1/departments/${id}/assign-member`, data),

  approveRequest: (id: number, data: { requestId: number }) =>
    post<void>(`/v1/departments/${id}/approve-request`, data),

  addFollowup: (id: number, data: { memberId: number; notes: string }) =>
    post<void>(`/v1/departments/${id}/followup`, data),

  getAlerts: (id: number, params?: { threshold?: number }) =>
    get<Array<{ memberId: number; lastFollowup: string }>>(`/v1/departments/${id}/alerts`, params),
};

// ─── Fellowships ─────────────────────────────────────────────────

export const fellowships = {
  create: (data: Partial<Fellowship>) =>
    post<Fellowship>('/v1/fellowships', data),

  list: (params?: ListParams) =>
    get<PaginatedResponse<Fellowship>>('/v1/fellowships', params),

  get: (id: number) =>
    get<Fellowship>(`/v1/fellowships/${id}`),

  addMember: (id: number, data: { memberId: number }) =>
    post<void>(`/v1/fellowships/${id}/add-member`, data),

  sendMessage: (id: number, data: { title: string; body: string; memberIds?: number[] }) =>
    post<void>(`/v1/fellowships/${id}/send-message`, data),
};

// ─── Attendance ──────────────────────────────────────────────────

export const attendance = {
  recordService: (data: {
    serviceDate: string;
    serviceType: string;
    branchId: number;
    records: Array<{ memberId: number; status: string }>;
  }) =>
    post<Service>('/v1/attendance/service', data),

  listService: (params?: ListParams) =>
    get<PaginatedResponse<ServiceAttendance>>('/v1/attendance/service', params),

  recordFellowship: (data: {
    meetingDate: string;
    fellowshipId: number;
    location: string;
    notes?: string;
    records: Array<{ memberId: number; status: string }>;
  }) =>
    post<void>('/v1/attendance/fellowship', data),

  listFellowship: (params?: ListParams) =>
    get<PaginatedResponse<ServiceAttendance>>('/v1/attendance/fellowship', params),

  getTrends: (params?: { branchId?: number; weeks?: number }) =>
    get<Array<{ week: string; percentage: number }>>('/v1/attendance/trends', params),

  getMissingMembers: (params?: { branchId?: number; consecutiveAbsences?: number }) =>
    get<Array<{ memberId: number; memberName: string; lastAttendance: string }>>(
      '/v1/attendance/missing-members',
      params
    ),

  export: (params?: ListParams) =>
    get<{ url: string }>('/v1/attendance/export', params),
};

// ─── Outreach ────────────────────────────────────────────────────

export const outreach = {
  createProgram: (data: Partial<OutreachProgram>) =>
    post<OutreachProgram>('/v1/outreach/programs', data),

  listPrograms: (params?: ListParams) =>
    get<PaginatedResponse<OutreachProgram>>('/v1/outreach/programs', params),

  registerWorker: (programId: number, data: { memberId: number }) =>
    post<void>(`/v1/outreach/programs/${programId}/register-worker`, data),

  getProgram: (id: number) =>
    get<OutreachProgram & { participants: Member[]; souls: Soul[] }>(`/v1/outreach/programs/${id}`),

  completeProgram: (id: number) =>
    put<OutreachProgram>(`/v1/outreach/programs/${id}/complete`, {}),

  overrideBranch: (data: { memberId: number; newBranchId: number }) =>
    post<void>('/v1/outreach/override-branch', data),
};

// ─── Souls ───────────────────────────────────────────────────────

export const souls = {
  create: (data: Partial<Soul>) =>
    post<Soul>('/v1/souls', data),

  list: (params?: ListParams) =>
    get<PaginatedResponse<Soul>>('/v1/souls', params),

  get: (id: number) =>
    get<Soul & { followUps: FollowUp[] }>(`/v1/souls/${id}`),

  addFollowup: (id: number, data: Partial<FollowUp>) =>
    post<FollowUp>(`/v1/souls/${id}/followup`, data),

  updateStatus: (id: number, data: { status: string; convertedToMemberId?: number }) =>
    put<Soul>(`/v1/souls/${id}/status`, data),

  getAlerts: (params?: { threshold?: number }) =>
    get<Array<{ soulId: number; assignedMemberId: number; lastFollowup: string }>>(
      '/v1/souls/alerts',
      params
    ),

  getConversionFunnel: (params?: { branchId?: number }) =>
    get<Record<string, number>>('/v1/souls/conversion-funnel', params),

  reassign: (id: number, data: { memberId: number }) =>
    put<Soul>(`/v1/souls/${id}/reassign`, data),

  getFollowUpTracker: (params?: { tab?: string; search?: string; status?: string; contactMethod?: string }) =>
    get<{ pending: number; completed: number; items: FollowUp[] }>('/v1/souls/follow-up-tracker', params),
};

// ─── Donations ───────────────────────────────────────────────────

export const donations = {
  createOnline: (data: { amount: number; purpose: string; paymentMethod: string; description?: string }) =>
    post<Donation>('/v1/donations/online', data),

  createManual: (data: Partial<Donation>) =>
    post<Donation>('/v1/donations/manual', data),

  list: (params?: ListParams) =>
    get<PaginatedResponse<Donation>>('/v1/donations', params),

  getReports: (params?: { branchId?: number; startDate?: string; endDate?: string }) =>
    get<{ totalByPurpose: Record<string, number>; totalByBranch: Record<string, number>; topDonors: Array<{ name: string; total: number }> }>(
      '/v1/donations/reports',
      params
    ),

  export: (params?: ListParams) =>
    get<{ url: string }>('/v1/donations/export', params),

  getMemberSummary: (params?: { memberId?: number; year?: number }) =>
    get<{ memberId: number; total: number; byPurpose: Record<string, number> }>(
      '/v1/donations/member-summary',
      params
    ),
};

// ─── Forms ───────────────────────────────────────────────────────

export const forms = {
  create: (data: Partial<Form>) =>
    post<Form>('/v1/forms', data),

  list: (params?: ListParams) =>
    get<PaginatedResponse<Form>>('/v1/forms', params),

  get: (id: number) =>
    get<Form>(`/v1/forms/${id}`),

  submit: (id: number, data: Record<string, unknown>) =>
    post<FormSubmission>(`/v1/forms/${id}/submit`, data),

  listSubmissions: (params?: ListParams) =>
    get<PaginatedResponse<FormSubmission>>('/v1/forms/submissions', params),

  exportSubmissions: (params?: ListParams) =>
    get<{ url: string }>('/v1/forms/submissions/export', params),

  saveTemplate: (data: { name: string; definition: Record<string, unknown> }) =>
    post<Form>('/v1/forms/save-template', data),

  listTemplates: (params?: ListParams) =>
    get<PaginatedResponse<Form>>('/v1/forms/templates', params),
};

// ─── Notifications ───────────────────────────────────────────────

export const notifications = {
  create: (data: Partial<Notification>) =>
    post<Notification>('/v1/notifications', data),

  list: (params?: ListParams) =>
    get<PaginatedResponse<NotificationRecipient & { notification: Notification }>>(
      '/v1/notifications',
      params
    ),

  markRead: (id: number) =>
    put<void>(`/v1/notifications/${id}/read`),

  markAllRead: () =>
    put<void>('/v1/notifications/read-all'),

  broadcast: (data: { title: string; body: string; priority: string; targetScope: string; targetId?: number; expiresAt?: string }) =>
    post<Notification>('/v1/notifications/broadcast', data),
};

// ─── Dashboard ───────────────────────────────────────────────────

export interface AdminDashboard {
  totalMembers: number;
  totalBranches: number;
  totalDepartments: number;
  totalFellowships: number;
  donationsLast30Days: number;
  soulsLast30Days: number;
  attendancePercentage: number;
  attendanceTrends: Array<{ week: string; percentage: number }>;
  recentActivity: Array<{ action: string; timestamp: string; actor: string }>;
}

export interface PastorDashboard {
  branchMemberCount: number;
  branchDonationsLast30Days: number;
  branchAttendanceTrends: Array<{ week: string; percentage: number }>;
  branchSouls: number;
  overdueFollowups: number;
}

export interface LeaderDashboard {
  groupMemberCount: number;
  recentAttendance: Array<{ date: string; present: number; total: number }>;
  membersNeedingFollowup: number;
  pendingJoinRequests: number;
}

export const dashboard = {
  getAdmin: () =>
    get<AdminDashboard>('/v1/dashboard/admin'),

  getPastor: () =>
    get<PastorDashboard>('/v1/dashboard/pastor'),

  getLeader: () =>
    get<LeaderDashboard>('/v1/dashboard/leader'),
};

// ─── Reports ─────────────────────────────────────────────────────

export const reports = {
  members: (params?: ListParams) =>
    get<PaginatedResponse<Member>>('/v1/reports/members', params),

  attendance: (params?: { branchId?: number; startDate?: string; endDate?: string }) =>
    get<Array<{ week: string; percentage: number }>>('/v1/reports/attendance', params),

  donations: (params?: { branchId?: number; startDate?: string; endDate?: string }) =>
    get<{ totalByPurpose: Record<string, number>; totalByBranch: Record<string, number> }>(
      '/v1/reports/donations',
      params
    ),

  souls: (params?: { branchId?: number }) =>
    get<Record<string, number>>('/v1/reports/souls', params),

  followups: (params?: { branchId?: number }) =>
    get<Array<{ memberId: number; memberName: string; lastFollowup: string; daysOverdue: number }>>(
      '/v1/reports/followups',
      params
    ),
};

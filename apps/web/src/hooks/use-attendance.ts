'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  ServiceListParams,
  RosterParams,
  CreateServiceRequest,
  UpdateServiceRequest,
  RecordServiceAttendanceRequest,
  AttendanceTrendsParams,
  MissingMembersParams,
  BranchAttendanceParams,
  AttendanceSummaryParams,
  CohortDiffRequest,
} from '@kairos/types';

// ── Service queries ────────────────────────────────────────

export function useServices(params?: ServiceListParams) {
  return useQuery({
    queryKey: ['attendance', 'services', params],
    queryFn: async () => {
      const res = await api.attendance.listServices(params);
      return res.data!;
    },
  });
}

export function useService(id: string) {
  return useQuery({
    queryKey: ['attendance', 'service', id],
    queryFn: async () => {
      const res = await api.attendance.getService(id);
      return res.data!;
    },
    enabled: !!id,
  });
}

export function useServiceRoster(
  serviceId: string,
  params?: RosterParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['attendance', 'roster', serviceId, params],
    queryFn: async () => {
      const res = await api.attendance.roster(serviceId, params);
      return res.data!;
    },
    enabled: (options?.enabled ?? true) && !!serviceId,
  });
}

export function useServiceAttendance(serviceId: string) {
  return useQuery({
    queryKey: ['attendance', 'records', serviceId],
    queryFn: async () => {
      const res = await api.attendance.listAttendance(serviceId);
      return res.data!;
    },
    enabled: !!serviceId,
  });
}

// ── Report queries ─────────────────────────────────────────

export function useAttendanceTrends(params?: AttendanceTrendsParams) {
  return useQuery({
    queryKey: ['attendance', 'trends', params],
    queryFn: async () => {
      const res = await api.attendance.trends(params);
      return res.data!;
    },
  });
}

export function useMissingMembers(params?: MissingMembersParams) {
  return useQuery({
    queryKey: ['attendance', 'missing-members', params],
    queryFn: async () => {
      const res = await api.attendance.missingMembers(params);
      return res.data!;
    },
  });
}

export function useAttendanceByBranch(params?: BranchAttendanceParams) {
  return useQuery({
    queryKey: ['attendance', 'by-branch', params],
    queryFn: async () => {
      const res = await api.attendance.byBranch(params);
      return res.data!;
    },
  });
}

export function useAttendanceSummary(params?: AttendanceSummaryParams) {
  return useQuery({
    queryKey: ['attendance', 'summary', params],
    queryFn: async () => {
      const res = await api.attendance.summary(params);
      return res.data!;
    },
  });
}

// ── Service mutations ──────────────────────────────────────

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateServiceRequest) => {
      const res = await api.attendance.createService(data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', 'services'] }),
  });
}

export function useUpdateService(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateServiceRequest) => {
      const res = await api.attendance.updateService(id, data);
      return res.data!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'services'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'service', id] });
    },
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.attendance.deleteService(id);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', 'services'] }),
  });
}

export function useRecordAttendance(serviceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: RecordServiceAttendanceRequest) => {
      const res = await api.attendance.recordAttendance(serviceId, data);
      return res.data!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'roster', serviceId] });
      qc.invalidateQueries({ queryKey: ['attendance', 'service', serviceId] });
      qc.invalidateQueries({ queryKey: ['attendance', 'records', serviceId] });
    },
  });
}

// ── Caller capability (drives UI gating: list page CTAs, /new route guard, [id] CheckInPanel) ──

export function useCanRecordAttendance(params?: { branchId?: string }) {
  return useQuery({
    queryKey: ['attendance', 'me', 'can-record', params],
    queryFn: async () => {
      const res = await api.attendance.canRecord(params);
      return res.data!;
    },
    staleTime: 60_000,
  });
}

// ── Cohort comparison (set-diff between 2 service selections) ──

export function useCohortDiff() {
  return useMutation({
    mutationFn: async (data: CohortDiffRequest) => {
      const res = await api.attendance.cohortDiff(data);
      return res.data!;
    },
  });
}

// ── Caller's personal attendance snapshot (/me/attendance, dashboard card) ──

export function useMyAttendance(params?: { weeks?: number }) {
  return useQuery({
    queryKey: ['attendance', 'me', 'snapshot', params],
    queryFn: async () => {
      const res = await api.attendance.mine(params);
      return res.data!;
    },
    staleTime: 60_000,
  });
}

// ── Department service-attendance report (Phase 4a) ───────

export function useDepartmentAttendance(branchDeptId: string, params?: { weeks?: number }, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['attendance', 'department', branchDeptId, params],
    queryFn: async () => {
      const res = await api.attendance.departmentReport(branchDeptId, params);
      return res.data!;
    },
    enabled: (options?.enabled ?? true) && !!branchDeptId,
    staleTime: 60_000,
  });
}

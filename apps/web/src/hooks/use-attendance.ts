import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

// Services
export function useServices(params?: {
  page?: number;
  limit?: number;
  branchId?: string;
  serviceType?: string;
  startDate?: string;
  endDate?: string;
}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['services', params],
    queryFn: () => api.attendance.services.list(params),
    enabled: !!accessToken, // Only run when authenticated
  });
}

export function useService(id: string) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['services', id],
    queryFn: () => api.attendance.services.get(id),
    enabled: !!id && !!accessToken, // Only run when authenticated and ID is provided
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.attendance.services.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.attendance.services.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['services', variables.id] });
    },
  });
}

// Attendance
export function useServiceAttendance(serviceId: string) {
  return useQuery({
    queryKey: ['service-attendance', serviceId],
    queryFn: () => api.attendance.services.getAttendance(serviceId),
    enabled: !!serviceId,
  });
}

export function useRecordAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serviceId, data }: { serviceId: string; data: { records: any[] } }) =>
      api.attendance.services.recordAttendance(serviceId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-attendance', variables.serviceId] });
      queryClient.invalidateQueries({ queryKey: ['services', variables.serviceId] });
    },
  });
}

export function useUpdateAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serviceId, memberId, data }: { serviceId: string; memberId: string; data: any }) =>
      api.attendance.services.updateAttendance(serviceId, memberId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-attendance', variables.serviceId] });
      queryClient.invalidateQueries({ queryKey: ['services', variables.serviceId] });
    },
  });
}

export function useDeleteAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serviceId, memberId }: { serviceId: string; memberId: string }) =>
      api.attendance.services.deleteAttendance(serviceId, memberId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-attendance', variables.serviceId] });
      queryClient.invalidateQueries({ queryKey: ['services', variables.serviceId] });
    },
  });
}

// Reports
export function useAttendanceTrends(params?: { branchId?: string; weeks?: number }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['attendance-trends', params],
    queryFn: () => api.attendance.reports.trends(params),
    enabled: !!accessToken && !!user,
  });
}

export function useDetailedAttendanceTrends(params?: { branchId?: string; weeks?: number }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['detailed-attendance-trends', params],
    queryFn: () => api.attendance.reports.detailedTrends(params),
    enabled: !!accessToken && !!user,
  });
}

export function useAttendanceByBranch(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['attendance-by-branch', params],
    queryFn: () => api.attendance.reports.byBranch(params),
    enabled: params !== undefined,
  });
}

export function useFirstTimeVisitors(params?: {
  branchId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['first-time-visitors', params],
    queryFn: () => api.attendance.reports.firstTimeVisitors(params),
  });
}

export function useMemberAttendanceHistory(
  memberId: string,
  params?: { startDate?: string; endDate?: string; limit?: number },
) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const query = useQuery({
    queryKey: ['member-attendance-history', memberId, params],
    queryFn: () => api.attendance.memberHistory(memberId, params),
    enabled: !!memberId && !!accessToken,
  });
  
  console.log('=== useMemberAttendanceHistory Hook ===');
  console.log('Member ID:', memberId);
  console.log('Params:', params);
  console.log('Access Token exists:', !!accessToken);
  console.log('Query enabled:', !!memberId && !!accessToken);
  console.log('Query status:', query.status);
  console.log('Query data:', query.data);
  console.log('Query error:', query.error);
  
  return query;
}

// Self Check-In
export function useMyAttendanceStatus(serviceId: string) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['my-attendance-status', serviceId],
    queryFn: () => api.attendance.getMyStatus(serviceId),
    enabled: !!serviceId && !!accessToken,
  });
}

export function useSelfCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serviceId, data }: { serviceId: string; data?: { attendanceStatus?: 'Present' | 'Virtual' | 'Late'; arrivalTime?: string } }) =>
      api.attendance.selfCheckIn(serviceId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-attendance-status', variables.serviceId] });
      queryClient.invalidateQueries({ queryKey: ['service-attendance', variables.serviceId] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: (_, variables) => {
      // If check-in fails (e.g. already checked in), refetch status to update UI
      queryClient.invalidateQueries({ queryKey: ['my-attendance-status', variables.serviceId] });
    },
  });
}

export function useMissingMembers(params?: { branchId?: string; weeks?: number }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['missing-members', params],
    queryFn: () => api.attendance.reports.missingMembers(params),
    enabled: !!accessToken && !!user && params !== undefined,
  });
}

export function useAttendanceByServiceType(params?: { branchId?: string; weeks?: number }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['attendance-by-service-type', params],
    queryFn: () => api.attendance.reports.byServiceType(params),
    enabled: !!accessToken && !!user && params !== undefined,
  });
}

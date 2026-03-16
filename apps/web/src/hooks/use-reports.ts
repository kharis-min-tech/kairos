import { useQuery } from '@tanstack/react-query';
import { reports } from '@kairos/api-client';

export const reportKeys = {
  attendance: (params?: { branchId?: number; startDate?: string; endDate?: string }) =>
    ['reports', 'attendance', params] as const,
  donations: (params?: { branchId?: number; startDate?: string; endDate?: string }) =>
    ['reports', 'donations', params] as const,
  souls: (params?: { branchId?: number }) => ['reports', 'souls', params] as const,
};

export function useAttendanceReport(params?: { branchId?: number; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: reportKeys.attendance(params),
    queryFn: () => reports.attendance(params),
  });
}

export function useDonationReport(params?: { branchId?: number; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: reportKeys.donations(params),
    queryFn: () => reports.donations(params),
  });
}

export function useSoulReport(params?: { branchId?: number }) {
  return useQuery({
    queryKey: reportKeys.souls(params),
    queryFn: () => reports.souls(params),
  });
}

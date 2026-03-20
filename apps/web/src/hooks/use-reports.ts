'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useMemberGrowth() {
  return useQuery({
    queryKey: ['reports', 'member-growth'],
    queryFn: async () => {
      const res = await api.reports.memberGrowth();
      return res.data!;
    },
  });
}

export function useAttendanceTrend() {
  return useQuery({
    queryKey: ['reports', 'attendance-trend'],
    queryFn: async () => {
      const res = await api.reports.attendanceTrend();
      return res.data!;
    },
  });
}

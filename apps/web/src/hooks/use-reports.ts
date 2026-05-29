'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

// member-growth and attendance-trend are admin/pastor only
export function useMemberGrowth() {
  const activeRole = useAuthStore((s) => s.activeRole);
  return useQuery({
    queryKey: ['reports', 'member-growth'],
    queryFn: async () => {
      const res = await api.reports.memberGrowth();
      return res.data!;
    },
    enabled: activeRole === 'admin' || activeRole === 'pastor',
    retry: false,
    throwOnError: false,
  });
}

export function useAttendanceTrend() {
  const activeRole = useAuthStore((s) => s.activeRole);
  return useQuery({
    queryKey: ['reports', 'attendance-trend'],
    queryFn: async () => {
      const res = await api.reports.attendanceTrend();
      return res.data!;
    },
    enabled: activeRole === 'admin' || activeRole === 'pastor',
    retry: false,
    throwOnError: false,
  });
}

export function useOutreachOverview() {
  return useQuery({
    queryKey: ['reports', 'outreach-overview'],
    queryFn: async () => {
      const res = await api.dashboard.overview();
      return res.data! as {
        totalSouls: number;
        ragCounts: { RED: number; AMBER: number; GREEN: number };
        statusCounts: Record<string, number>;
        criticalCount: number;
        monitorCount: number;
        allGoodCount: number;
      };
    },
    retry: false,
    throwOnError: false,
  });
}

export function useOutreachAnalytics() {
  return useQuery({
    queryKey: ['reports', 'outreach-analytics'],
    queryFn: async () => {
      const res = await api.dashboard.analytics();
      return res.data! as {
        overview: {
          totalSouls: number;
          converted: number;
          conversionRate: number;
          avgDaysToConversion: number;
          activeFollowUps: number;
        };
        conversionFunnel: Record<string, number>;
        statusDistribution: Record<string, number>;
        responseRates: { method: string; rate: number; total: number }[];
      };
    },
    retry: false,
    throwOnError: false,
  });
}

// fellowship stats are available to all authenticated roles
export function useFellowshipStats() {
  return useQuery({
    queryKey: ['analytics', 'fellowship-stats'],
    queryFn: async () => {
      const res = await api.analytics.fellowshipStats();
      return res.data!;
    },
    retry: false,
    throwOnError: false,
  });
}

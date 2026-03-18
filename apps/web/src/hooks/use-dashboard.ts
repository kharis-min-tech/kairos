'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['analytics', 'admin'],
    queryFn: async () => {
      const res = await api.analytics.adminStats();
      return res.data!;
    },
  });
}

export function useBranchDashboard() {
  return useQuery({
    queryKey: ['analytics', 'branch'],
    queryFn: async () => {
      const res = await api.analytics.branchStats();
      return res.data!;
    },
  });
}

export function useMemberDashboard() {
  return useQuery({
    queryKey: ['analytics', 'member'],
    queryFn: async () => {
      const res = await api.analytics.memberStats();
      return res.data!;
    },
  });
}

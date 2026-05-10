'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export function useAdminDashboard() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['analytics', 'admin'],
    queryFn: async () => {
      const res = await api.analytics.adminStats();
      return res.data!;
    },
    enabled: !!accessToken && !!user,
  });
}

export function useBranchDashboard() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['analytics', 'branch'],
    queryFn: async () => {
      const res = await api.analytics.branchStats();
      return res.data!;
    },
    enabled: !!accessToken && !!user,
  });
}

export function useMemberDashboard() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['analytics', 'member'],
    queryFn: async () => {
      const res = await api.analytics.memberStats();
      return res.data!;
    },
    enabled: !!accessToken && !!user,
  });
}

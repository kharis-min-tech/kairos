'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export function useAdminDashboard() {
  const activeRole = useAuthStore((s) => s.activeRole);
  return useQuery({
    queryKey: ['analytics', 'admin'],
    queryFn: async () => {
      const res = await api.analytics.adminStats();
      return res.data!;
    },
    enabled: activeRole === 'admin',
    retry: false,
    throwOnError: false,
  });
}

export function useBranchDashboard() {
  const activeRole = useAuthStore((s) => s.activeRole);
  return useQuery({
    queryKey: ['analytics', 'branch'],
    queryFn: async () => {
      const res = await api.analytics.branchStats();
      return res.data!;
    },
    // RBAC Phase 4c: API gates by capability. Fetch when logged in.
    enabled: !!activeRole,
    retry: false,
    throwOnError: false,
  });
}

export function useMemberDashboard() {
  const activeRole = useAuthStore((s) => s.activeRole);
  return useQuery({
    queryKey: ['analytics', 'member'],
    queryFn: async () => {
      const res = await api.analytics.memberStats();
      return res.data!;
    },
    enabled: !!activeRole,
    retry: false,
    throwOnError: false,
  });
}

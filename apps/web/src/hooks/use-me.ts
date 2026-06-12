'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { MeLeadershipResponse } from '@kairos/types';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export interface MyRotaParams {
  from?: string;
  to?: string;
}

export function useMyRota(params?: MyRotaParams) {
  return useQuery({
    queryKey: ['me', 'rota', params],
    queryFn: async () => {
      const res = await api.me.rota(params);
      return res.data!;
    },
  });
}

/**
 * Snapshot of the caller's leadership authority — branch-admin assignments,
 * fellowship leadership, department leadership. Source of truth for the
 * dashboard fork. On success, mirrors `branchSystemAdminBranchIds` and
 * `branchDataAdminBranchIds` into the auth store so subsequent renders (and
 * pages that load before this hook resolves) can read the same authority.
 */
export function useMyLeadership() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const setBranchAdminAuthority = useAuthStore((s) => s.setBranchAdminAuthority);

  const query = useQuery<MeLeadershipResponse>({
    queryKey: ['me', 'leadership'],
    queryFn: async () => {
      const res = await api.me.leadership();
      return res.data!;
    },
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data) {
      setBranchAdminAuthority({
        branchSystemAdminBranchIds: query.data.branchSystemAdminBranchIds,
        branchDataAdminBranchIds: query.data.branchDataAdminBranchIds,
      });
    }
  }, [query.data, setBranchAdminAuthority]);

  return query;
}

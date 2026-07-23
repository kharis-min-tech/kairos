'use client';

import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { DeleteAccountRequest, MeLeadershipResponse } from '@kairos/types';
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

/**
 * Fetch the caller's data export and trigger a browser download as JSON.
 * Returns nothing — the side effect (the download) is the point. Errors
 * bubble up so the caller can surface them.
 */
export async function downloadMyDataExport(): Promise<void> {
  const res = await api.me.exportData();
  const data = res.data;
  if (!data) throw new Error('Export returned no data');
  const filename = `kairos-my-data-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * User-initiated account deletion. The API scrubs PII on the member row and
 * flips isActive=false. On success the caller should log out and route to
 * the login page.
 */
export function useDeleteMyAccount() {
  return useMutation({
    mutationFn: async (data: DeleteAccountRequest) => {
      const res = await api.me.deleteAccount(data);
      return res.data!;
    },
  });
}

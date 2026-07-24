'use client';

import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { DeleteAccountRequest, MeLeadershipResponse } from '@kairos/types';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { buildDataExportHtml } from '@/lib/data-export-html';

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

function triggerDownload(filename: string, blob: Blob): void {
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
 * Fetch the caller's data export and download it as a readable HTML report.
 * Opens in any browser by double-clicking; users can print or save-as-PDF
 * from the browser's print dialog.
 */
export async function downloadMyDataExportHtml(): Promise<void> {
  const res = await api.me.exportData();
  const data = res.data;
  if (!data) throw new Error('Export returned no data');
  const html = buildDataExportHtml(data as Parameters<typeof buildDataExportHtml>[0]);
  const filename = `kharis-my-data-${new Date().toISOString().slice(0, 10)}.html`;
  triggerDownload(filename, new Blob([html], { type: 'text/html;charset=utf-8' }));
}

/**
 * Fetch the caller's data export and download the raw JSON. Kept for GDPR
 * portability (Art. 20 — structured, machine-readable) and anyone comfortable
 * with the raw fields.
 */
export async function downloadMyDataExportJson(): Promise<void> {
  const res = await api.me.exportData();
  const data = res.data;
  if (!data) throw new Error('Export returned no data');
  const filename = `kharis-my-data-${new Date().toISOString().slice(0, 10)}.json`;
  triggerDownload(filename, new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
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

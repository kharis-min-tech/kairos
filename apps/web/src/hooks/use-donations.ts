'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { 
  RecordManualDonationRequest, 
  ListDonationsParams, 
  DonationReportsParams 
} from '@kairos/types';

// ── Donation queries ───────────────────────────────────────

export function useDonations(params?: ListDonationsParams) {
  return useQuery({
    queryKey: ['donations', params],
    queryFn: async () => {
      const res = await api.donations.list(params);
      return res.data!;
    },
    retry: 1,
    staleTime: 30_000,
  });
}

export function useDonationReports(params?: DonationReportsParams) {
  return useQuery({
    queryKey: ['donations', 'reports', params],
    queryFn: async () => {
      const res = await api.donations.reports(params);
      return res.data!;
    },
  });
}

export function useMemberDonationSummary(memberId: string) {
  return useQuery({
    queryKey: ['donations', 'member', memberId],
    queryFn: async () => {
      const res = await api.donations.memberSummary(memberId);
      return res.data!;
    },
    enabled: !!memberId,
  });
}

// ── Donation mutations ─────────────────────────────────────

export function useRecordManualDonation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: RecordManualDonationRequest) => {
      const res = await api.donations.recordManual(data);
      return res.data!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['donations'] });
    },
  });
}

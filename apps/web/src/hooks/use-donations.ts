import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { donations } from '@kairos/api-client';
import type { Donation } from '@kairos/types';

type ListParams = {
  page?: number;
  limit?: number;
  [key: string]: string | number | boolean | undefined;
};

export const donationKeys = {
  all: ['donations'] as const,
  lists: () => [...donationKeys.all, 'list'] as const,
  list: (params?: ListParams) => [...donationKeys.lists(), params] as const,
  reports: (params?: { branchId?: number; startDate?: string; endDate?: string }) =>
    [...donationKeys.all, 'reports', params] as const,
  memberSummary: (params?: { memberId?: number; year?: number }) =>
    [...donationKeys.all, 'member-summary', params] as const,
};

export function useDonations(params?: ListParams) {
  return useQuery({
    queryKey: donationKeys.list(params),
    queryFn: () => donations.list(params),
  });
}

export function useCreateOnlineDonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; purpose: string; paymentMethod: string; description?: string }) =>
      donations.createOnline(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: donationKeys.lists() });
    },
  });
}

export function useCreateManualDonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Donation>) => donations.createManual(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: donationKeys.lists() });
    },
  });
}

export function useDonationReports(params?: { branchId?: number; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: donationKeys.reports(params),
    queryFn: () => donations.getReports(params),
  });
}

export function useMemberDonationSummary(params?: { memberId?: number; year?: number }) {
  return useQuery({
    queryKey: donationKeys.memberSummary(params),
    queryFn: () => donations.getMemberSummary(params),
    enabled: !!params?.memberId,
  });
}

export function useExportDonations(params?: ListParams) {
  return useQuery({
    queryKey: ['donations', 'export', params],
    queryFn: () => donations.export(params),
    enabled: false,
  });
}

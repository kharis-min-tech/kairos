'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { RecordConsentRequest } from '@kairos/types';

const KEY = ['me', 'consent'] as const;

export function useMyConsentStatuses() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await api.me.consent.list()).data!,
    // Consent state changes rarely (only when the user accepts, or the API
    // bumps a version). Cache for 5 minutes so dashboard navigations don't
    // pay the round-trip and the layout gate can decide instantly on warm
    // navigations. The mutation invalidates KEY on accept, so a fresh accept
    // still refreshes immediately.
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export function useRecordConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: RecordConsentRequest) =>
      (await api.me.consent.record(data)).data!,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

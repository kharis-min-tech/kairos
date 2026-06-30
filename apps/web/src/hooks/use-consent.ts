'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { RecordConsentRequest } from '@kairos/types';

const KEY = ['me', 'consent'] as const;

export function useMyConsentStatuses() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await api.me.consent.list()).data!,
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

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SubmitPilotInterestRequest } from '@kairos/types';

/**
 * The commitments, fetched rather than hardcoded in the page.
 *
 * The wording a person agreed to is stamped onto their row by version. If the
 * page carried its own copy, the two could drift and nobody would notice
 * until somebody argued about what they had signed up to.
 */
export function usePilotRequirements() {
  return useQuery({
    queryKey: ['pilot-interest', 'requirements'],
    queryFn: async () => (await api.pilotInterest.requirements()).data!,
    staleTime: Infinity,
  });
}

export function useSubmitPilotInterest() {
  return useMutation({
    mutationFn: async (data: SubmitPilotInterestRequest) =>
      (await api.pilotInterest.submit(data)).data!,
  });
}

export function usePilotInterestList(params?: { status?: string }) {
  return useQuery({
    queryKey: ['pilot-interest', params],
    queryFn: async () => (await api.pilotInterest.list(params)).data!,
  });
}

export function useUpdatePilotInterest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: { id: string; status: string; reviewNotes?: string }) =>
      (await api.pilotInterest.update(id, data)).data!,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pilot-interest'] }),
  });
}

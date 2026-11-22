'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SubmitPilotInterestRequest } from '@kairos/types';

/**
 * Submitting is the whole module.
 *
 * Nothing is stored, so there is nothing to read back: no list, no status, no
 * cache to invalidate. The commitments the page shows come from
 * `PILOT_REQUIREMENTS` directly rather than through a query, since they are a
 * constant the web app already has at build time.
 */
export function useSubmitPilotInterest() {
  return useMutation({
    mutationFn: async (data: SubmitPilotInterestRequest) =>
      (await api.pilotInterest.submit(data)).data!,
  });
}

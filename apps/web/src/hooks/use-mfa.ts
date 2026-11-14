'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  MfaCodeRequest,
  MfaPasswordRequest,
} from '@kairos/types';
import { api } from '@/lib/api';

/**
 * The second factor, client side.
 *
 * Two families, split by which credential the call carries. The plain hooks
 * use the stored session: a member managing their own factor in settings.
 * The `*Challenge` hooks take a pre-MFA token as an argument, because the
 * caller has no session yet and the store is empty.
 */

export const MFA_QUERY_KEY = ['mfa'] as const;

export function useMfaStatus(enabled = true) {
  return useQuery({
    queryKey: MFA_QUERY_KEY,
    queryFn: async () => (await api.auth.mfa.status()).data!,
    enabled,
  });
}

/** Begin enrolment from settings. Returns the secret and the otpauth:// URI. */
export function useStartMfaEnrolment() {
  return useMutation({
    mutationFn: async () => (await api.auth.mfa.enrol()).data!,
  });
}

export function useConfirmMfaEnrolment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: MfaCodeRequest) => (await api.auth.mfa.confirm(data)).data!,
    onSuccess: () => qc.invalidateQueries({ queryKey: MFA_QUERY_KEY }),
  });
}

export function useDisableMfa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: MfaPasswordRequest) => (await api.auth.mfa.disable(data)).data!,
    onSuccess: () => qc.invalidateQueries({ queryKey: MFA_QUERY_KEY }),
  });
}

export function useRegenerateBackupCodes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: MfaPasswordRequest) =>
      (await api.auth.mfa.regenerateBackupCodes(data)).data!,
    // The remaining-codes count on the status card is now stale by exactly
    // the number of codes that were just voided.
    onSuccess: () => qc.invalidateQueries({ queryKey: MFA_QUERY_KEY }),
  });
}

/**
 * Exchange a pre-MFA token and a code for a session.
 *
 * No `onSuccess` invalidation: there is no cache to refresh yet, and the
 * caller has to persist the session before any authenticated query can run.
 */
export function useVerifyMfaChallenge() {
  return useMutation({
    mutationFn: async ({ code, token }: MfaCodeRequest & { token: string }) =>
      (await api.auth.mfa.verify({ code }, token)).data!,
  });
}

/** Enrolment forced mid-sign-in, after the cutover date. */
export function useStartChallengeEnrolment() {
  return useMutation({
    mutationFn: async (token: string) => (await api.auth.mfa.enrolWithChallenge(token)).data!,
  });
}

export function useConfirmChallengeEnrolment() {
  return useMutation({
    mutationFn: async ({ code, token }: MfaCodeRequest & { token: string }) =>
      (await api.auth.mfa.confirmWithChallenge({ code }, token)).data!,
  });
}

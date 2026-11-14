'use client';

import { create } from 'zustand';
import type { MfaChallenge } from '@kairos/types';

/**
 * The half-finished sign-in: a pre-MFA token and which half is outstanding.
 *
 * Deliberately NOT persisted, unlike `auth-store`. This token is a bearer
 * credential, and the whole point of a second factor is that a password alone
 * does not get you in — writing the thing that completes a sign-in into
 * localStorage, where any XSS can read it at leisure, would hand back most of
 * what the factor is there to protect. It is also short-lived, so persisting
 * it mostly stores something already expired.
 *
 * Losing it on refresh is therefore correct behaviour, not a gap: the member
 * starts again from /login, which costs them a password and ten seconds. The
 * page says so rather than showing an empty form.
 *
 * Two sign-in doors fill this: the password form and the OAuth callback. They
 * push to /mfa afterwards, which is the only reader.
 */
interface MfaChallengeState {
  token: string | null;
  stage: MfaChallenge['stage'] | null;
  /** Where the member was heading before the factor interrupted them. */
  returnTo: string | null;
  start: (challenge: MfaChallenge & { returnTo?: string | null }) => void;
  clear: () => void;
}

export const useMfaChallengeStore = create<MfaChallengeState>((set) => ({
  token: null,
  stage: null,
  returnTo: null,
  start: ({ token, stage, returnTo }) =>
    set({ token, stage, returnTo: returnTo ?? null }),
  clear: () => set({ token: null, stage: null, returnTo: null }),
}));

import { create } from 'zustand';
import type { MfaChallenge } from '@kairos/types';

/**
 * The half-finished sign-in: a pre-MFA token and which half is outstanding.
 *
 * Deliberately plain in-memory state, unlike `store/auth.ts`, which puts the
 * session in SecureStore. This token is the credential that completes a
 * sign-in, and the point of a second factor is that a password alone does not
 * get you in. Persisting it would leave something on the device that finishes
 * a sign-in on its own, which is most of what the factor exists to prevent.
 * It is also short-lived, so persisting it mostly stores something expired.
 *
 * Losing it when the app is killed is therefore right, not a gap: the member
 * starts again from the login screen. The screen says so rather than showing
 * a code field that cannot work.
 *
 * Three sign-in doors fill it: the password form, the OAuth callback, and the
 * OAuth confirm-link exchange. `(auth)/mfa` is the only reader.
 */
interface MfaChallengeState {
  token: string | null;
  stage: MfaChallenge['stage'] | null;
  start: (challenge: MfaChallenge) => void;
  clear: () => void;
}

export const useMfaChallengeStore = create<MfaChallengeState>((set) => ({
  token: null,
  stage: null,
  start: ({ token, stage }) => set({ token, stage }),
  clear: () => set({ token: null, stage: null }),
}));

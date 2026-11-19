import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthTokens, MemberProfile } from '@kairos/types';
import { setSessionTokens, api } from '@/lib/api-client';
import * as biometric from '@/lib/biometric';

const KEY_ACCESS = 'kairos.access_token';
const KEY_REFRESH = 'kairos.refresh_token';
const KEY_USER = 'kairos.user';

interface AuthState {
  hydrated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: MemberProfile | null;

  hydrate: () => Promise<void>;
  setSession: (tokens: AuthTokens, user: MemberProfile) => Promise<void>;
  updateTokens: (tokens: AuthTokens) => Promise<void>;
  updateUser: (patch: Partial<MemberProfile>) => Promise<void>;
  clearSession: () => Promise<void>;
  /**
   * Unlock the sealed refresh token for a specific armed user, exchange it for
   * a live pair, fetch that user's profile fresh, and set the session.
   */
  signInWithBiometric: (memberId: string, promptLabel: string) => Promise<BiometricSignInResult>;
}

/**
 * Why this is not a boolean any more.
 *
 * It was, and every failure collapsed to "Try again or use your email and
 * password". That advice is wrong in one specific case, and mandatory MFA made
 * that case universal rather than rare: a seal written before the member
 * enrolled a second factor is refused by the API forever, and a password
 * sign-in on its own never repaired it. Telling someone to retry something
 * that cannot work is worse than telling them nothing.
 *
 *   - `cancelled`  the keychain never gave us the token. Prompt dismissed,
 *                  wrong finger, phone locked mid-check. Genuinely retriable
 *                  and must stay silent-ish, which is why it is separate.
 *   - `stale_seal` we hold a seal without `mfa: true`. The fix is a full
 *                  sign-in, after which `setSession` reseals automatically.
 *   - `rejected`   the server refused the token for some other reason, or the
 *                  profile fetch failed. Password sign-in, and re-arm from
 *                  Security if biometric still will not take.
 */
export type BiometricSignInResult =
  | { ok: true }
  | { ok: false; reason: 'cancelled' | 'stale_seal' | 'rejected' };

/**
 * Replace a sealed refresh token that predates the member's second factor.
 *
 * Returns nothing and throws nothing: every branch is a no-op from the
 * caller's point of view. See the comment at the call site in `setSession`
 * for which transition this fires on and why it can only fire once.
 */
async function maybeResealBiometric(memberId: string, refreshToken: string): Promise<void> {
  try {
    if (!biometric.tokenHasMfa(refreshToken)) return;
    if (await biometric.sealedTokenHasMfa(memberId)) return;
    if (!(await biometric.isArmedFor(memberId))) return;
    await biometric.reseal(memberId, refreshToken);
  } catch {
    // Storage read failed, or the keychain refused. Either way the session
    // being persisted is fine and the seal is no worse than it was.
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  hydrated: false,
  accessToken: null,
  refreshToken: null,
  user: null,

  hydrate: async () => {
    try {
      const [access, refresh, userJson] = await Promise.all([
        SecureStore.getItemAsync(KEY_ACCESS),
        SecureStore.getItemAsync(KEY_REFRESH),
        AsyncStorage.getItem(KEY_USER),
      ]);
      const user = userJson ? (JSON.parse(userJson) as MemberProfile) : null;
      const hasTokens = !!access && !!refresh;
      set({
        accessToken: access,
        refreshToken: refresh,
        user,
        hydrated: true,
      });
      setSessionTokens(hasTokens ? { accessToken: access!, refreshToken: refresh! } : null);
    } catch {
      set({ hydrated: true });
    }
  },

  setSession: async (tokens, user) => {
    await Promise.all([
      SecureStore.setItemAsync(KEY_ACCESS, tokens.accessToken),
      SecureStore.setItemAsync(KEY_REFRESH, tokens.refreshToken),
      AsyncStorage.setItem(KEY_USER, JSON.stringify(user)),
    ]);
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
    });
    setSessionTokens(tokens);

    // Biometric arming is still never turned ON here: first-time opt-in is the
    // enrolment modal on the login screen, and the Security toggle owns on/off.
    // Automatic post-login resealing raised a keychain-write biometric prompt
    // on Android after every single sign-in, which read as broken.
    //
    // The one repair this does perform, and the narrowest form of it that
    // works. A seal written before the member had a second factor carries
    // `mfa: false`, and the API refuses such a token once a factor is
    // confirmed, so biometric fails every time with no self-service way out.
    // Replacing it needs one keychain write. Gated on the claim actually
    // CHANGING, so:
    //
    //   - a member with no second factor never sees this, because their new
    //     token is `mfa: false` too and there is no transition;
    //   - a member with one sees it at most once ever, because the flag is
    //     recorded as soon as the write lands;
    //   - a member who is not armed never sees it at all.
    //
    // Failure is not propagated. The caller is persisting a session that has
    // already succeeded, and a refused prompt here must not make a good
    // sign-in look broken. The old seal and the arming both survive, so the
    // offer simply comes back next time.
    await maybeResealBiometric(user.id, tokens.refreshToken);
  },

  updateTokens: async (tokens) => {
    await Promise.all([
      SecureStore.setItemAsync(KEY_ACCESS, tokens.accessToken),
      SecureStore.setItemAsync(KEY_REFRESH, tokens.refreshToken),
    ]);
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    setSessionTokens(tokens);
  },

  updateUser: async (patch) => {
    const current = useAuthStore.getState().user;
    if (!current) return;
    const next = { ...current, ...patch };
    await AsyncStorage.setItem(KEY_USER, JSON.stringify(next));
    set({ user: next });
  },

  clearSession: async () => {
    // Live tokens + cached "who was signed in last" go, always.
    await Promise.all([
      SecureStore.deleteItemAsync(KEY_ACCESS),
      SecureStore.deleteItemAsync(KEY_REFRESH),
      AsyncStorage.removeItem(KEY_USER),
    ]);
    // Biometric arming is intentionally NOT touched here. It lives per-user
    // in its own list; signing out one account has no effect on any armed
    // user's sealed refresh token. To fully wipe biometric, the user toggles
    // it OFF in Security first (which calls biometric.disable(memberId)) and
    // then signs out.
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
    });
    setSessionTokens(null);
  },

  /**
   * Sign in with biometrics for a specific armed user (chosen from the login
   * picker). Unlocks THAT user's sealed refresh token, exchanges it for a
   * live pair, fetches a fresh profile from the server (so we never restore
   * stale cached data across account switches), and sets the session.
   *
   * The biometric prompt is raised by the KEYCHAIN refusing to unseal the
   * refresh token without authentication — not by us gating a value we
   * already hold. See lib/biometric.ts for why that distinction is the whole
   * feature.
   *
   * Failure carries a reason, because one of them needs different advice from
   * the others. See `BiometricSignInResult`.
   */
  signInWithBiometric: async (memberId: string, promptLabel: string) => {
    const sealed = await biometric.unlockRefreshToken(memberId, promptLabel);
    // The keychain never handed anything over: dismissed prompt, no match,
    // enrolment changed since sealing. Nothing to diagnose and nothing broken.
    if (!sealed) return { ok: false as const, reason: 'cancelled' as const };

    /**
     * Classify a server refusal from what we were holding rather than from the
     * error text, which is not a contract. A seal lacking `mfa: true` is the
     * one the API now refuses outright once a factor is confirmed, and the
     * repair for it differs from every other failure.
     *
     * An expired seal that also lacks the claim lands here too, and that is
     * acceptable: the advice is identical, because completing a full sign-in
     * fixes both. The message is therefore written as what to do, not as a
     * diagnosis of why.
     */
    const failure = () =>
      biometric.tokenHasMfa(sealed)
        ? { ok: false as const, reason: 'rejected' as const }
        : { ok: false as const, reason: 'stale_seal' as const };

    try {
      const refreshRes = await api.auth.refresh({ refreshToken: sealed });
      const tokens = refreshRes.data;
      if (!tokens) return failure();

      // Fetch profile with the new access token before setSession so the
      // shape lives entirely on the server. We never restore a cached
      // profile keyed on the last-used member — that's how the wrong avatar
      // used to flash across account switches.
      setSessionTokens(tokens);
      const meRes = await api.members.me();
      const user = meRes.data;
      if (!user) return failure();

      await Promise.all([
        SecureStore.setItemAsync(KEY_ACCESS, tokens.accessToken),
        SecureStore.setItemAsync(KEY_REFRESH, tokens.refreshToken),
        AsyncStorage.setItem(KEY_USER, JSON.stringify(user)),
      ]);
      set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user,
      });
      // Deliberately NOT resealing here. The user already did one biometric
      // prompt to unlock; on Android a SecureStore write under
      // requireAuthentication raises a SECOND prompt, and a two-prompt
      // sign-in every time was the loudest UX complaint after the initial
      // multi-account rework. The sealed token stays valid for its full TTL
      // from arming (currently 1 year, see DEFAULT_REFRESH_EXPIRY on the API),
      // regardless of how often it is used to sign in. When it eventually
      // expires biometric fails once, the user password-signs-in, and can
      // re-arm from Security if they want another window.
      //
      // Note this path can never be the one that repairs a stale seal: it has
      // no way to obtain an `mfa: true` token, because the token it started
      // from is precisely the one the server refuses. Repair belongs in
      // setSession, after a full sign-in.
      return { ok: true as const };
    } catch {
      // Sealed token refused, account revoked, or /me failed.
      return failure();
    }
  },
}));


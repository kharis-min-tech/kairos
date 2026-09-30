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
   * a live pair, fetch that user's profile fresh, and set the session. Returns
   * false on any failure; the caller falls back to the password form.
   */
  signInWithBiometric: (memberId: string, promptLabel: string) => Promise<boolean>;
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
    // Deliberately does NOT touch biometric. Every path that ARMS or RESEALS
    // is now user-initiated — the enrolment modal on the login screen for
    // first-time opt-in, and the Security toggle for switching it on/off.
    // Automatic post-login resealing raised a keychain-write biometric
    // prompt on Android after every sign-in, which read as broken.
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
   * Returns false on every failure path (cancelled, no match, sealed token
   * expired, account revoked); the caller falls back to the password form.
   */
  signInWithBiometric: async (memberId: string, promptLabel: string) => {
    const sealed = await biometric.unlockRefreshToken(memberId, promptLabel);
    if (!sealed) return false;

    try {
      const refreshRes = await api.auth.refresh({ refreshToken: sealed });
      const tokens = refreshRes.data;
      if (!tokens) return false;

      // Fetch profile with the new access token before setSession so the
      // shape lives entirely on the server. We never restore a cached
      // profile keyed on the last-used member — that's how the wrong avatar
      // used to flash across account switches.
      setSessionTokens(tokens);
      const meRes = await api.members.me();
      const user = meRes.data;
      if (!user) return false;

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
      // multi-account rework. The sealed token stays valid until its own
      // 90-day expiry from the last password sign-in. Users who mix in a
      // password login within that window (via the login screen or an
      // explicit re-arm from Security) get the fresh window; users who only
      // ever biometric-sign-in fall back to the password screen once every
      // 90 days, which re-arms them.
      return true;
    } catch {
      // Sealed token expired, account revoked, or /me failed. All resolve to
      // the same user-facing outcome: sign in with your password.
      return false;
    }
  },
}));


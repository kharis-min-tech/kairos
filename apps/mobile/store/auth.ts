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
  /** Returns false on any failure; the caller falls back to the password form. */
  signInWithBiometric: (promptLabel: string) => Promise<boolean>;
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
    await Promise.all([
      SecureStore.deleteItemAsync(KEY_ACCESS),
      SecureStore.deleteItemAsync(KEY_REFRESH),
      AsyncStorage.removeItem(KEY_USER),
    ]);
    // Signing out must also drop the sealed copy. Leaving it behind would mean
    // a signed-out device still had a redeemable refresh token sitting in the
    // keychain, which is the opposite of what signing out means.
    await biometric.disable();
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
    });
    setSessionTokens(null);
  },

  /**
   * Sign in with biometrics.
   *
   * The prompt is raised by the KEYCHAIN refusing to unseal the refresh token
   * without authentication — not by us gating a value we already hold. See
   * lib/biometric.ts for why that distinction is the whole feature.
   *
   * The unsealed token is then exchanged for a live pair, because a 7-day
   * refresh token is not an access token and the API will not accept it as
   * one. Returns false on every failure path (cancelled, no match, enrolment
   * changed, token expired); the caller falls back to the password form.
   */
  signInWithBiometric: async (promptLabel: string) => {
    const sealed = await biometric.unlockRefreshToken(promptLabel);
    if (!sealed) return false;

    try {
      const res = await api.auth.refresh({ refreshToken: sealed });
      const tokens = res.data;
      if (!tokens) return false;

      const userJson = await AsyncStorage.getItem(KEY_USER);
      const user = userJson ? (JSON.parse(userJson) as MemberProfile) : null;
      // The profile is cached alongside the tokens. Without it there is no
      // session to restore, only credentials, so send them to the full form.
      if (!user) return false;

      await Promise.all([
        SecureStore.setItemAsync(KEY_ACCESS, tokens.accessToken),
        SecureStore.setItemAsync(KEY_REFRESH, tokens.refreshToken),
      ]);
      set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user,
      });
      setSessionTokens(tokens);
      return true;
    } catch {
      // The sealed token has expired (7 days) or the account is gone. Both
      // mean the same thing to the user: sign in with your password.
      return false;
    }
  },
}));

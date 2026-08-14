import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthTokens, MemberProfile } from '@kairos/types';
import { setSessionTokens } from '@/lib/api-client';

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
  clearSession: () => Promise<void>;
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

  clearSession: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(KEY_ACCESS),
      SecureStore.deleteItemAsync(KEY_REFRESH),
      AsyncStorage.removeItem(KEY_USER),
    ]);
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
    });
    setSessionTokens(null);
  },
}));

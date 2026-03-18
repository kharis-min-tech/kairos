import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthTokens, Member } from '@kairos/types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: Member | null;
  setTokens: (tokens: AuthTokens) => void;
  setUser: (user: Member | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: (tokens) =>
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    {
      name: 'kairos-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthTokens, Member } from '@kairos/types';
import type { SystemRole } from '@kairos/types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: Member | null;
  activeRole: SystemRole | null;
  mustChangePassword: boolean;
  setTokens: (tokens: AuthTokens) => void;
  setUser: (user: Member | null) => void;
  setActiveRole: (role: SystemRole) => void;
  setMustChangePassword: (val: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      activeRole: null,
      mustChangePassword: false,
      setTokens: (tokens) =>
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      setUser: (user) => set({ user }),
      setActiveRole: (role) => set({ activeRole: role }),
      setMustChangePassword: (val) => set({ mustChangePassword: val }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null, activeRole: null, mustChangePassword: false }),
    }),
    {
      name: 'kairos-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        activeRole: state.activeRole,
      }),
    },
  ),
);

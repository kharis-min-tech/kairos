import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthTokens, Member } from '@kairos/types';
import type { SystemRole } from '@kairos/types';

interface BranchAdminAuthority {
  branchSystemAdminBranchIds: string[];
  branchDataAdminBranchIds: string[];
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: Member | null;
  activeRole: SystemRole | null;
  mustChangePassword: boolean;
  /**
   * Branch IDs where the caller holds the Branch System Admin role. Populated
   * after login via the /api/me/leadership endpoint (the dashboard's hook
   * pushes this into the store on success). System admins get `[]` here —
   * their authority flows from `activeRole === 'admin'`, not this list.
   */
  branchSystemAdminBranchIds: string[];
  /**
   * Branch IDs where the caller holds Branch Data Admin authority (lead /
   * deputy of the per-branch 'Admin' department). Populated by the
   * /api/me/leadership hook.
   */
  branchDataAdminBranchIds: string[];
  setTokens: (tokens: AuthTokens) => void;
  setUser: (user: Member | null) => void;
  setActiveRole: (role: SystemRole) => void;
  setMustChangePassword: (val: boolean) => void;
  setBranchAdminAuthority: (authority: BranchAdminAuthority) => void;
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
      branchSystemAdminBranchIds: [],
      branchDataAdminBranchIds: [],
      setTokens: (tokens) =>
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      setUser: (user) => set({ user }),
      setActiveRole: (role) => set({ activeRole: role }),
      setMustChangePassword: (val) => set({ mustChangePassword: val }),
      setBranchAdminAuthority: ({ branchSystemAdminBranchIds, branchDataAdminBranchIds }) =>
        set({ branchSystemAdminBranchIds, branchDataAdminBranchIds }),
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          activeRole: null,
          mustChangePassword: false,
          branchSystemAdminBranchIds: [],
          branchDataAdminBranchIds: [],
        }),
    }),
    {
      name: 'kairos-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        activeRole: state.activeRole,
        branchSystemAdminBranchIds: state.branchSystemAdminBranchIds,
        branchDataAdminBranchIds: state.branchDataAdminBranchIds,
      }),
    },
  ),
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthTokens, Member, RoleOption, RoleScope } from '@kairos/types';
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
  /**
   * Optional scope tying the activeRole to a specific entity. Mirrored from
   * the access-token JWT payload at every persist (login / finalize-role /
   * switch-role). Phase 4 will use this to narrow page-level filters.
   */
  scope: RoleScope | null;
  /**
   * The caller's full set of role options (computed server-side from their
   * leadership footprint). Drives the header role switcher. Persisted so a
   * page reload doesn't blank the dropdown — the list is bounded by the
   * user's authority so the payload stays small.
   */
  availableRoles: RoleOption[];
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
  setScope: (scope: RoleScope | null) => void;
  setAvailableRoles: (roles: RoleOption[]) => void;
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
      scope: null,
      availableRoles: [],
      mustChangePassword: false,
      branchSystemAdminBranchIds: [],
      branchDataAdminBranchIds: [],
      setTokens: (tokens) =>
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      setUser: (user) => set({ user }),
      setActiveRole: (role) => set({ activeRole: role }),
      setScope: (scope) => set({ scope }),
      setAvailableRoles: (roles) => set({ availableRoles: roles }),
      setMustChangePassword: (val) => set({ mustChangePassword: val }),
      setBranchAdminAuthority: ({ branchSystemAdminBranchIds, branchDataAdminBranchIds }) =>
        set({ branchSystemAdminBranchIds, branchDataAdminBranchIds }),
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          activeRole: null,
          scope: null,
          availableRoles: [],
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
        scope: state.scope,
        availableRoles: state.availableRoles,
        branchSystemAdminBranchIds: state.branchSystemAdminBranchIds,
        branchDataAdminBranchIds: state.branchDataAdminBranchIds,
      }),
    },
  ),
);

/**
 * Decode the `scope` field off a JWT access token without verification.
 * The server already verified the signature before issuing — the client
 * only needs the payload for UI state. Returns `null` on any decode error
 * so callers can fail safe.
 *
 * Kept colocated with auth-store because it's the only consumer: the
 * `persistAuthSuccess` writer pulls scope out of the JWT so we don't
 * need a parallel `scope` field on every API response.
 */
export function decodeScopeFromAccessToken(accessToken: string): RoleScope | null {
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;
    const payloadB64 = parts[1]!;
    // base64url → base64
    const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf-8');
    const payload = JSON.parse(json) as { scope?: RoleScope };
    return payload.scope ?? null;
  } catch {
    return null;
  }
}

'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { decodeScopeFromAccessToken, useAuthStore } from '@/lib/auth-store';
import type {
  FinalizeRoleRequest,
  FinalizeRoleResponse,
  LoginResponse,
  RoleOption,
  SignupRequest,
  SwitchRoleRequest,
  SwitchRoleResponse,
} from '@kairos/types';

type LoginCredentials = { email: string; password: string };

/**
 * Two-step login (Phase 2 of roadmap item 9): the hook only fires the
 * credentials check and returns the discriminated `LoginResponse`. The
 * caller (`/login` page) inspects `data.roleSelectionRequired` and either:
 *   - persists tokens + routes onward (single-role path), or
 *   - stashes the role-selection envelope and navigates to `/select-role`
 *     (multi-role path; `useFinalizeRole` persists later).
 *
 * The hook deliberately does NOT auto-persist, because the multi-role path
 * has no tokens to persist yet.
 */
export function useLogin() {
  return useMutation<LoginResponse, Error, LoginCredentials>({
    mutationFn: async (data) => {
      const res = await api.auth.login(data);
      return res.data!;
    },
  });
}

/**
 * Step 2 of two-step login: exchange the short-lived sessionToken for
 * real access/refresh tokens by committing to one of the roles returned
 * with the login response. The `/select-role` page persists tokens on
 * success.
 */
export function useFinalizeRole() {
  return useMutation<FinalizeRoleResponse, Error, FinalizeRoleRequest>({
    mutationFn: async (data) => {
      const res = await api.auth.finalizeRole(data);
      return res.data!;
    },
  });
}

/**
 * Phase 3: swap to a different available role on the same session. Used
 * by the header `RoleSwitcherDropdown` — the caller passes the picked
 * `RoleOption.key` (plus activeRole + scope) and we trade the current
 * access token for a fresh pair carrying the new role. Re-validates
 * server-side, so revoked authority can't be re-selected.
 *
 * Does NOT auto-persist (mirrors useLogin/useFinalizeRole) — the
 * dropdown calls `persistAuthSuccess` on success so the writer stays
 * the single source of truth for store updates.
 */
export function useSwitchRole() {
  return useMutation<SwitchRoleResponse, Error, SwitchRoleRequest>({
    mutationFn: async (data) => {
      const res = await api.auth.switchRole(data);
      return res.data!;
    },
  });
}

/** Persist a successful auth handshake (single-role login, finalize-role,
 *  OR switch-role) into the auth store. Lives here so all writers go
 *  through one path. Pulls `scope` out of the JWT payload so callers
 *  don't have to thread it through every response shape. */
export function persistAuthSuccess({
  tokens,
  member,
  activeRole,
  availableRoles,
}: {
  tokens: { accessToken: string; refreshToken: string };
  member: FinalizeRoleResponse['member'];
  activeRole: FinalizeRoleResponse['member']['systemRole'];
  /** Pass when the server response carries a fresh role list (finalize-role,
   *  switch-role). Login's single-role path omits — dashboard layout
   *  back-fills from `/api/auth/available-roles` on mount. */
  availableRoles?: RoleOption[];
}) {
  const store = useAuthStore.getState();
  store.setTokens(tokens);
  store.setUser(member as never);
  store.setMustChangePassword(member.mustChangePassword);
  store.setActiveRole(activeRole);
  store.setScope(decodeScopeFromAccessToken(tokens.accessToken));
  if (availableRoles !== undefined) {
    store.setAvailableRoles(availableRoles);
  }
}

export function useSignup() {
  return useMutation({
    mutationFn: async (data: SignupRequest) => {
      const res = await api.auth.signup(data);
      return res.data!;
    },
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: async (token: string) => {
      await api.auth.verifyEmail({ token });
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await api.auth.forgotPassword({ email });
      return res.data;
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (data: { token: string; newPassword: string }) => {
      await api.auth.resetPassword(data);
    },
  });
}

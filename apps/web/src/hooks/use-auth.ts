'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { decodeScopeFromAccessToken, useAuthStore } from '@/lib/auth-store';
import type { LoginResponse, MemberProfile, SignupRequest, SystemRole } from '@kairos/types';

type LoginCredentials = { email: string; password: string };

/**
 * Single-step login (RBAC Phase 5a): credentials → tokens + member.
 * Capabilities ride along on the JWT's `grants` array.
 */
export function useLogin() {
  return useMutation<LoginResponse, Error, LoginCredentials>({
    mutationFn: async (data) => {
      const res = await api.auth.login(data);
      return res.data!;
    },
  });
}

/** Persist a successful login into the auth store. */
export function persistAuthSuccess({
  tokens,
  member,
  activeRole,
}: {
  tokens: { accessToken: string; refreshToken: string };
  member: MemberProfile;
  activeRole: SystemRole;
}) {
  const store = useAuthStore.getState();
  store.setTokens(tokens);
  store.setUser(member as never);
  store.setMustChangePassword(member.mustChangePassword);
  store.setActiveRole(activeRole);
  store.setScope(decodeScopeFromAccessToken(tokens.accessToken));
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

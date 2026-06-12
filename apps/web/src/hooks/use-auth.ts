'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { LoginRequest, SignupRequest } from '@kairos/types';

export function useLogin() {
  const { setTokens, setUser, setActiveRole, setMustChangePassword } = useAuthStore();

  return useMutation({
    mutationFn: async (data: LoginRequest) => {
      const res = await api.auth.login(data);
      return res.data!;
    },
    onSuccess: (data, variables) => {
      // Phase 1 of roadmap item 9 widened `LoginResponse` into a flat-with-
      // flags shape so multi-role users can land on a role picker. Phase 2
      // will branch this hook on `data.roleSelectionRequired`. Until then,
      // every legacy caller still passes `activeRole`, which forces the
      // server's direct-finalize path → tokens/member are populated.
      setTokens(data.tokens!);
      setUser(data.member as never);
      setMustChangePassword(data.member!.mustChangePassword);
      if (variables.activeRole) {
        setActiveRole(variables.activeRole);
      }
    },
  });
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

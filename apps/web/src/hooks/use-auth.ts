'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { LoginRequest, SignupRequest } from '@kairos/types';

export function useLogin() {
  const { setTokens, setUser } = useAuthStore();

  return useMutation({
    mutationFn: async (data: LoginRequest) => {
      const res = await api.auth.login(data);
      return res.data!;
    },
    onSuccess: (data) => {
      setTokens(data.tokens);
      setUser(data.member as never);
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
      await api.auth.forgotPassword({ email });
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

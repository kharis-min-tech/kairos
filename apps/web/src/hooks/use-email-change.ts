'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useRequestEmailChange() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newEmail: string }) => {
      await api.auth.requestEmailChange(data);
    },
  });
}

export function useConfirmEmailChange() {
  return useMutation({
    mutationFn: async (token: string) => {
      await api.auth.confirmEmailChange({ token });
    },
  });
}

export function useUndoEmailChange() {
  return useMutation({
    mutationFn: async (token: string) => (await api.auth.undoEmailChange({ token })).data!,
  });
}

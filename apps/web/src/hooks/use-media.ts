'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { MintUploadUrlRequest } from '@kairos/types';

export function useMintUploadUrl() {
  return useMutation({
    mutationFn: async (data: MintUploadUrlRequest) => (await api.media.mintUploadUrl(data)).data!,
  });
}

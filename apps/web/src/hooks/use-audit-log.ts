'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const KEY = ['me', 'audit-log'] as const;

export function useMyAuditLog() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.me.auditLog();
      return res.data!;
    },
  });
}

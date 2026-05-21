'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface MyRotaParams {
  from?: string;
  to?: string;
}

export function useMyRota(params?: MyRotaParams) {
  return useQuery({
    queryKey: ['me', 'rota', params],
    queryFn: async () => {
      const res = await api.me.rota(params);
      return res.data!;
    },
  });
}

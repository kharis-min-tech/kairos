'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { UpdateNotificationPreferenceRequest } from '@kairos/types';

const KEY = ['me', 'notification-preferences'] as const;

export function useNotificationPreferences() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.me.notificationPreferences.list();
      return res.data!;
    },
  });
}

export function useUpdateNotificationPreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateNotificationPreferenceRequest) => {
      const res = await api.me.notificationPreferences.update(data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

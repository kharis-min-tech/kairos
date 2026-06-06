'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CreateAnnouncementRequest } from '@kairos/types';

export function useAnnouncements(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['announcements', params],
    queryFn: async () => {
      const res = await api.messaging.getAnnouncements(params);
      return res.data ?? [];
    },
  });
}

export function useSendAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAnnouncementRequest) => api.messaging.sendAnnouncement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

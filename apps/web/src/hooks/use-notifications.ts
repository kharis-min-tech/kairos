import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@kairos/api-client';

type ListParams = {
  page?: number;
  limit?: number;
  [key: string]: string | number | boolean | undefined;
};

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (params?: ListParams) => [...notificationKeys.lists(), params] as const,
};

export function useNotificationsList(params?: ListParams) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notifications.list(params),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notifications.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    },
  });
}

export function useBroadcastNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      body: string;
      priority: string;
      targetScope: string;
      targetId?: number;
      expiresAt?: string;
    }) => notifications.broadcast(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    },
  });
}

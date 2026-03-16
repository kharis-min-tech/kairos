import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fellowships } from '@kairos/api-client';
import type { Fellowship } from '@kairos/types';

type ListParams = {
  page?: number;
  limit?: number;
  [key: string]: string | number | boolean | undefined;
};

export const fellowshipKeys = {
  all: ['fellowships'] as const,
  lists: () => [...fellowshipKeys.all, 'list'] as const,
  list: (params?: ListParams) => [...fellowshipKeys.lists(), params] as const,
  details: () => [...fellowshipKeys.all, 'detail'] as const,
  detail: (id: number) => [...fellowshipKeys.details(), id] as const,
};

export function useFellowships(params?: ListParams) {
  return useQuery({
    queryKey: fellowshipKeys.list(params),
    queryFn: () => fellowships.list(params),
  });
}

export function useFellowship(id: number) {
  return useQuery({
    queryKey: fellowshipKeys.detail(id),
    queryFn: () => fellowships.get(id),
    enabled: id > 0,
  });
}

export function useCreateFellowship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Fellowship>) => fellowships.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fellowshipKeys.lists() });
    },
  });
}

export function useAddFellowshipMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fellowshipId, memberId }: { fellowshipId: number; memberId: number }) =>
      fellowships.addMember(fellowshipId, { memberId }),
    onSuccess: (_, { fellowshipId }) => {
      queryClient.invalidateQueries({ queryKey: fellowshipKeys.detail(fellowshipId) });
    },
  });
}

export function useSendFellowshipMessage() {
  return useMutation({
    mutationFn: ({ fellowshipId, data }: { fellowshipId: number; data: { title: string; body: string; memberIds?: number[] } }) =>
      fellowships.sendMessage(fellowshipId, data),
  });
}

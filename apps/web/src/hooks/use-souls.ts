import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { souls } from '@kairos/api-client';
import type { Soul, FollowUp } from '@kairos/types';

type ListParams = {
  page?: number;
  limit?: number;
  [key: string]: string | number | boolean | undefined;
};

export const soulKeys = {
  all: ['souls'] as const,
  lists: () => [...soulKeys.all, 'list'] as const,
  list: (params?: ListParams) => [...soulKeys.lists(), params] as const,
  details: () => [...soulKeys.all, 'detail'] as const,
  detail: (id: number) => [...soulKeys.details(), id] as const,
  funnel: (params?: { branchId?: number }) => [...soulKeys.all, 'funnel', params] as const,
  tracker: (params?: { tab?: string; search?: string; status?: string; contactMethod?: string }) =>
    [...soulKeys.all, 'tracker', params] as const,
};

export function useSouls(params?: ListParams) {
  return useQuery({
    queryKey: soulKeys.list(params),
    queryFn: () => souls.list(params),
  });
}

export function useSoul(id: number) {
  return useQuery({
    queryKey: soulKeys.detail(id),
    queryFn: () => souls.get(id),
    enabled: id > 0,
  });
}

export function useCreateSoul() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Soul>) => souls.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: soulKeys.lists() });
    },
  });
}

export function useAddSoulFollowup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ soulId, data }: { soulId: number; data: Partial<FollowUp> }) =>
      souls.addFollowup(soulId, data),
    onSuccess: (_, { soulId }) => {
      queryClient.invalidateQueries({ queryKey: soulKeys.detail(soulId) });
    },
  });
}

export function useUpdateSoulStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ soulId, data }: { soulId: number; data: { status: string; convertedToMemberId?: number } }) =>
      souls.updateStatus(soulId, data),
    onSuccess: (_, { soulId }) => {
      queryClient.invalidateQueries({ queryKey: soulKeys.detail(soulId) });
      queryClient.invalidateQueries({ queryKey: soulKeys.lists() });
    },
  });
}

export function useConversionFunnel(params?: { branchId?: number }) {
  return useQuery({
    queryKey: soulKeys.funnel(params),
    queryFn: () => souls.getConversionFunnel(params),
  });
}

export function useFollowUpTracker(params?: { tab?: string; search?: string; status?: string; contactMethod?: string }) {
  return useQuery({
    queryKey: soulKeys.tracker(params),
    queryFn: () => souls.getFollowUpTracker(params),
  });
}

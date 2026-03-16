import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { branches } from '@kairos/api-client';
import type { Branch } from '@kairos/types';

type ListParams = {
  page?: number;
  limit?: number;
  [key: string]: string | number | boolean | undefined;
};

export const branchKeys = {
  all: ['branches'] as const,
  lists: () => [...branchKeys.all, 'list'] as const,
  list: (params?: ListParams) => [...branchKeys.lists(), params] as const,
  details: () => [...branchKeys.all, 'detail'] as const,
  detail: (id: number) => [...branchKeys.details(), id] as const,
};

export function useBranches(params?: ListParams) {
  return useQuery({
    queryKey: branchKeys.list(params),
    queryFn: () => branches.list(params),
  });
}

export function useBranch(id: number) {
  return useQuery({
    queryKey: branchKeys.detail(id),
    queryFn: () => branches.get(id),
    enabled: id > 0,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Branch>) => branches.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: branchKeys.lists() });
    },
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Branch> }) => branches.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: branchKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: branchKeys.lists() });
    },
  });
}

export function useAssignPastor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ branchId, memberId }: { branchId: number; memberId: number }) =>
      branches.assignPastor(branchId, { memberId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: branchKeys.all });
    },
  });
}

export function useAssignElder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ branchId, memberId }: { branchId: number; memberId: number }) =>
      branches.assignElder(branchId, { memberId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: branchKeys.all });
    },
  });
}

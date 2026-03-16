import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { outreach } from '@kairos/api-client';
import type { OutreachProgram } from '@kairos/types';

type ListParams = {
  page?: number;
  limit?: number;
  [key: string]: string | number | boolean | undefined;
};

export const outreachKeys = {
  all: ['outreach'] as const,
  lists: () => [...outreachKeys.all, 'list'] as const,
  list: (params?: ListParams) => [...outreachKeys.lists(), params] as const,
  details: () => [...outreachKeys.all, 'detail'] as const,
  detail: (id: number) => [...outreachKeys.details(), id] as const,
};

export function useOutreachPrograms(params?: ListParams) {
  return useQuery({
    queryKey: outreachKeys.list(params),
    queryFn: () => outreach.listPrograms(params),
  });
}

export function useOutreachProgram(id: number) {
  return useQuery({
    queryKey: outreachKeys.detail(id),
    queryFn: () => outreach.getProgram(id),
    enabled: id > 0,
  });
}

export function useCreateOutreachProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<OutreachProgram>) => outreach.createProgram(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outreachKeys.lists() });
    },
  });
}

export function useRegisterOutreachWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, memberId }: { programId: number; memberId: number }) =>
      outreach.registerWorker(programId, { memberId }),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: outreachKeys.detail(programId) });
    },
  });
}

export function useCompleteOutreachProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => outreach.completeProgram(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: outreachKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: outreachKeys.lists() });
    },
  });
}

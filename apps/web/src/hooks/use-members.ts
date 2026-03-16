import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { members } from '@kairos/api-client';
import type { Member } from '@kairos/types';

type ListParams = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: string | number | boolean | undefined;
};

export const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (params?: ListParams) => [...memberKeys.lists(), params] as const,
  details: () => [...memberKeys.all, 'detail'] as const,
  detail: (id: number) => [...memberKeys.details(), id] as const,
};

export function useMembers(params?: ListParams) {
  return useQuery({
    queryKey: memberKeys.list(params),
    queryFn: () => members.list(params),
  });
}

export function useMember(id: number) {
  return useQuery({
    queryKey: memberKeys.detail(id),
    queryFn: () => members.get(id),
    enabled: id > 0,
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Member>) => members.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Member> }) => members.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

export function useApproveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => members.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => members.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

export function useImportMembers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { rows: Array<Record<string, string>>; branchId: number }) =>
      members.import(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

export function useExportMembers(params?: ListParams) {
  return useQuery({
    queryKey: ['members', 'export', params],
    queryFn: () => members.export(params),
    enabled: false, // manual trigger
  });
}

export function useMemberPhotoUploadUrl() {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { contentType: string; extension: string } }) =>
      members.getPhotoUploadUrl(id, data),
  });
}

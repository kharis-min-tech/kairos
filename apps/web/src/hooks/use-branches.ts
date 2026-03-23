'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CreateBranchRequest, UpdateBranchRequest, CreateRegionRequest, AssignLeadershipRequest, GetLeadershipParams } from '@kairos/types';

// ── Branch queries ─────────────────────────────────────────

export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.branches.list();
      return res.data!;
    },
  });
}

export function useBranch(id: string) {
  return useQuery({
    queryKey: ['branches', id],
    queryFn: async () => {
      const res = await api.branches.get(id);
      return res.data!;
    },
    enabled: !!id,
  });
}

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateBranchRequest) => {
      const res = await api.branches.create(data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });
}

export function useUpdateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBranchRequest }) => {
      const res = await api.branches.update(id, data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });
}

export function useDeleteBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.branches.delete(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });
}

// ── Region queries ─────────────────────────────────────────

export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const res = await api.regions.list();
      return res.data!;
    },
  });
}

export function useCreateRegion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateRegionRequest) => {
      const res = await api.regions.create(data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['regions'] }),
  });
}

// ── Leadership queries ─────────────────────────────────────

export function useBranchLeadership(branchId: string, params?: GetLeadershipParams) {
  return useQuery({
    queryKey: ['leadership', branchId, params],
    queryFn: async () => {
      const res = await api.leadership.list(branchId, params);
      return res.data!;
    },
    enabled: !!branchId,
  });
}

export function useAssignLeadership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchId, data }: { branchId: string; data: AssignLeadershipRequest }) => {
      const res = await api.leadership.assign(branchId, data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leadership'] }),
  });
}

export function useRemoveLeadership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchId, leadershipId }: { branchId: string; leadershipId: string }) => {
      await api.leadership.remove(branchId, leadershipId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leadership'] }),
  });
}

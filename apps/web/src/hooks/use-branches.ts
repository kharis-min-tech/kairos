'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CreateBranchRequest,
  UpdateBranchRequest,
  CreateRegionRequest,
  UpdateRegionRequest,
  AssignLeadershipRequest,
  GetLeadershipParams,
  AssignBranchRoleRequest,
} from '@kairos/types';

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

export function useUpdateRegion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRegionRequest }) => {
      const res = await api.regions.update(id, data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['regions'] }),
  });
}

export function useDeleteRegion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.regions.delete(id);
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

// ── Branch System Admin role queries ───────────────────────
//
// These three wrap the /api/branches/:id/roles endpoints. Visibility on the
// LIST endpoint is open to any branch admin (BSA or BDA); ASSIGN/REVOKE are
// gated to BSA only on the server. The page UI hides the assign/revoke
// controls from BDA-only callers as a UX nicety — the server is the
// authoritative gate.

export function useBranchRoles(branchId: string) {
  return useQuery({
    queryKey: ['branches', branchId, 'roles'],
    queryFn: async () => {
      const res = await api.branchRoles.list(branchId);
      return res.data!;
    },
    enabled: !!branchId,
    staleTime: 60 * 1000,
  });
}

export function useAssignBranchRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchId, data }: { branchId: string; data: AssignBranchRoleRequest }) => {
      const res = await api.branchRoles.assign(branchId, data);
      return res.data!;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['branches', vars.branchId, 'roles'] });
      qc.invalidateQueries({ queryKey: ['me', 'leadership'] });
    },
  });
}

export function useRevokeBranchRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchId, assignmentId }: { branchId: string; assignmentId: string }) => {
      const res = await api.branchRoles.revoke(branchId, assignmentId);
      return res.data!;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['branches', vars.branchId, 'roles'] });
      qc.invalidateQueries({ queryKey: ['me', 'leadership'] });
    },
  });
}

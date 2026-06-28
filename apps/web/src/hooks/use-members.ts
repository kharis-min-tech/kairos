'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { UpdateMemberRequest, ApproveMemberRequest, AssignRoleRequest, MemberListParams, CreateMemberRequest, UpsertHealthRecordRequest } from '@kairos/types';

// ── Member queries ─────────────────────────────────────────

export function useMembers(params?: MemberListParams, enabled: boolean = true) {
  return useQuery({
    queryKey: ['members', params],
    queryFn: async () => {
      const res = await api.members.list(params);
      return res.data!;
    },
    enabled,
  });
}

export function useMember(id: string) {
  return useQuery({
    queryKey: ['members', id],
    queryFn: async () => {
      const res = await api.members.get(id);
      return res.data!;
    },
    enabled: !!id,
  });
}

export function useMyProfile() {
  return useQuery({
    queryKey: ['members', 'me'],
    queryFn: async () => {
      const res = await api.members.me();
      return res.data!;
    },
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMemberRequest }) => {
      const res = await api.members.update(id, data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

export function useApproveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ApproveMemberRequest }) => {
      const res = await api.members.approve(id, data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

export function useDeactivateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.members.deactivate(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

export function useReactivateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.members.reactivate(id);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

// Task #33 P1: stamp or clear the membership-class completion timestamp.
// `completedAt: null` un-marks. Branch-write gated server-side.
export function useSetMembershipClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completedAt }: { id: string; completedAt: string | null }) => {
      const res = await api.members.setMembershipClass(id, completedAt);
      return res.data!;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['members', vars.id] });
    },
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateMemberRequest) => {
      const res = await api.members.create(data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

// ── Member Health Record (minor safeguarding) ──────────────

/**
 * Fetches the safeguarding health record for a minor. Pass `enabled` as
 * `isMinor && !redacted` so the request is only made when the viewer has
 * safeguarding access — otherwise the API would 403.
 */
export function useMemberHealthRecord(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['members', id, 'health-record'],
    queryFn: async () => {
      const res = await api.members.getHealthRecord(id);
      return res.data ?? null;
    },
    enabled: !!id && enabled,
  });
}

export function useUpsertMemberHealthRecord(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpsertHealthRecordRequest) => {
      const res = await api.members.upsertHealthRecord(id, data);
      return res.data ?? null;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', id, 'health-record'] });
      qc.invalidateQueries({ queryKey: ['members', id] });
    },
  });
}

// ── Safeguarding review ────────────────────────────────────

/**
 * Lists active minors whose guardian is missing ('none') or deactivated
 * ('inactive'), for safeguarding follow-up. The endpoint is gated server-side
 * to admin/pastor or a branch Safeguarding Lead — a viewer without access gets
 * a 403, which surfaces as `error`/`isError` so the page can render an access
 * state rather than an empty list.
 */
export function useUnguardedMinors(branchId?: string) {
  return useQuery({
    queryKey: ['members', 'unguarded-minors', branchId ?? null],
    queryFn: async () => {
      const res = await api.members.listUnguardedMinors(branchId ? { branchId } : undefined);
      return res.data!;
    },
  });
}

// ── Member Roles ───────────────────────────────────────────

export function useAllRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await api.members.roles.listAll();
      return res.data!;
    },
  });
}

export function useMemberRoles(memberId: string) {
  return useQuery({
    queryKey: ['members', memberId, 'roles'],
    queryFn: async () => {
      const res = await api.members.roles.list(memberId);
      return res.data!;
    },
    enabled: !!memberId,
  });
}

export function useAssignRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, data }: { memberId: string; data: AssignRoleRequest }) => {
      const res = await api.members.roles.assign(memberId, data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

export function useRemoveRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, roleAssignmentId }: { memberId: string; roleAssignmentId: string }) => {
      await api.members.roles.remove(memberId, roleAssignmentId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

export function useSwitchActiveBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const res = await api.members.switchActiveBranch(memberId);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

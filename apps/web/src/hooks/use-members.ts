'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { UpdateMemberRequest, ApproveMemberRequest, AssignRoleRequest, MemberListParams, CreateMemberRequest } from '@kairos/types';

// ── Member queries ─────────────────────────────────────────

export function useMembers(params?: MemberListParams) {
  return useQuery({
    queryKey: ['members', params],
    queryFn: async () => {
      const res = await api.members.list(params);
      return res.data!;
    },
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

// ── Member Roles ───────────────────────────────────────────

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

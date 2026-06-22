'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CreateFellowshipRequest,
  UpdateFellowshipRequest,
  CreateFellowshipMeetingRequest,
  AddFellowshipMemberRequest,
  FellowshipListParams,
  RecordAttendanceRequest,
  CreateJoinRequestRequest,
  ReviewJoinRequestRequest,
  ListFellowshipFollowupsParams,
  CreateFellowshipFollowupRequest,
  UpdateFellowshipFollowupRequest,
} from '@kairos/types';

// ── Fellowship queries ─────────────────────────────────────

export function useFellowships(params?: FellowshipListParams) {
  return useQuery({
    queryKey: ['fellowships', params],
    queryFn: async () => {
      const res = await api.fellowships.list(params);
      return res.data!;
    },
  });
}

export function useFellowship(id: string) {
  return useQuery({
    queryKey: ['fellowships', id],
    queryFn: async () => {
      const res = await api.fellowships.get(id);
      return res.data!;
    },
    enabled: !!id,
  });
}

export function useCreateFellowship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateFellowshipRequest) => {
      const res = await api.fellowships.create(data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fellowships'] }),
  });
}

export function useUpdateFellowship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateFellowshipRequest }) => {
      const res = await api.fellowships.update(id, data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fellowships'] }),
  });
}

export function useDeleteFellowship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.fellowships.delete(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fellowships'] }),
  });
}

// ── Fellowship aggregate stats (analytics) ────────────────

export function useFellowshipStats(
  fellowshipId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['fellowships', fellowshipId, 'stats'],
    queryFn: async () => {
      const res = await api.fellowships.stats(fellowshipId);
      return res.data!;
    },
    enabled: (options?.enabled ?? true) && !!fellowshipId,
    staleTime: 60_000,
  });
}

// ── Fellowship Members ─────────────────────────────────────

export function useFellowshipMembers(fellowshipId: string) {
  return useQuery({
    queryKey: ['fellowships', fellowshipId, 'members'],
    queryFn: async () => {
      const res = await api.fellowships.members.list(fellowshipId);
      return res.data!;
    },
    enabled: !!fellowshipId,
  });
}

export function useAddFellowshipMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fellowshipId, data }: { fellowshipId: string; data: AddFellowshipMemberRequest }) => {
      const res = await api.fellowships.members.add(fellowshipId, data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fellowships'] }),
  });
}

export function useRemoveFellowshipMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fellowshipId, memberId }: { fellowshipId: string; memberId: string }) => {
      await api.fellowships.members.remove(fellowshipId, memberId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fellowships'] }),
  });
}

// ── Meetings ───────────────────────────────────────────────

export function useFellowshipMeetings(fellowshipId: string) {
  return useQuery({
    queryKey: ['fellowships', fellowshipId, 'meetings'],
    queryFn: async () => {
      const res = await api.fellowships.meetings.list(fellowshipId);
      return res.data!;
    },
    enabled: !!fellowshipId,
  });
}

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fellowshipId, data }: { fellowshipId: string; data: CreateFellowshipMeetingRequest }) => {
      const res = await api.fellowships.meetings.create(fellowshipId, data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fellowships'] }),
  });
}

// ── Attendance ─────────────────────────────────────────────

export function useMeetingAttendance(fellowshipId: string, meetingId: string) {
  return useQuery({
    queryKey: ['fellowships', fellowshipId, 'meetings', meetingId, 'attendance'],
    queryFn: async () => {
      const res = await api.fellowships.attendance.get(fellowshipId, meetingId);
      return res.data!;
    },
    enabled: !!fellowshipId && !!meetingId,
  });
}

export function useRecordAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fellowshipId, meetingId, data }: { fellowshipId: string; meetingId: string; data: RecordAttendanceRequest }) => {
      await api.fellowships.attendance.record(fellowshipId, meetingId, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fellowships'] }),
  });
}

export function useAttendanceSummary(fellowshipId: string) {
  return useQuery({
    queryKey: ['fellowships', fellowshipId, 'attendance', 'summary'],
    queryFn: async () => {
      const res = await api.fellowships.attendance.summary(fellowshipId);
      return res.data!;
    },
    enabled: !!fellowshipId,
  });
}

// ── Join Requests ──────────────────────────────────────────

export function useFellowshipJoinRequests(fellowshipId: string) {
  return useQuery({
    queryKey: ['fellowships', fellowshipId, 'join-requests'],
    queryFn: async () => {
      const res = await api.fellowships.joinRequests.list(fellowshipId);
      return res.data!;
    },
    enabled: !!fellowshipId,
  });
}

export function useCreateJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fellowshipId, data }: { fellowshipId: string; data: CreateJoinRequestRequest }) => {
      const res = await api.fellowships.joinRequests.create(fellowshipId, data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fellowships'] }),
  });
}

export function useReviewJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fellowshipId, requestId, data }: { fellowshipId: string; requestId: string; data: ReviewJoinRequestRequest }) => {
      const res = await api.fellowships.joinRequests.review(fellowshipId, requestId, data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fellowships'] }),
  });
}

// ── Followups ──────────────────────────────────────────────

export function useFellowshipFollowups(
  fellowshipId: string,
  params?: ListFellowshipFollowupsParams,
) {
  return useQuery({
    queryKey: ['fellowships', fellowshipId, 'followups', params],
    queryFn: async () => {
      const res = await api.fellowships.followups.listForFellowship(fellowshipId, params);
      return res.data!;
    },
    enabled: !!fellowshipId,
  });
}

export function useOverdueFellowshipFollowups(fellowshipId: string, days?: number) {
  return useQuery({
    queryKey: ['fellowships', fellowshipId, 'followups', 'overdue', days],
    queryFn: async () => {
      const res = await api.fellowships.followups.listOverdue(fellowshipId, days);
      return res.data!;
    },
    enabled: !!fellowshipId,
  });
}

export function useFellowshipMemberFollowups(fellowshipId: string, memberId: string) {
  return useQuery({
    queryKey: ['fellowships', fellowshipId, 'members', memberId, 'followups'],
    queryFn: async () => {
      const res = await api.fellowships.followups.listForMember(fellowshipId, memberId);
      return res.data!;
    },
    enabled: !!fellowshipId && !!memberId,
  });
}

export function useCreateFellowshipFollowup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      fellowshipId,
      memberId,
      data,
    }: {
      fellowshipId: string;
      memberId: string;
      data: CreateFellowshipFollowupRequest;
    }) => {
      const res = await api.fellowships.followups.create(fellowshipId, memberId, data);
      return res.data!;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['fellowships', vars.fellowshipId, 'followups'] });
      qc.invalidateQueries({
        queryKey: ['fellowships', vars.fellowshipId, 'members', vars.memberId, 'followups'],
      });
    },
  });
}

export function useUpdateFellowshipFollowup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      fellowshipId,
      followupId,
      data,
    }: {
      fellowshipId: string;
      followupId: string;
      data: UpdateFellowshipFollowupRequest;
    }) => {
      const res = await api.fellowships.followups.update(fellowshipId, followupId, data);
      return res.data!;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['fellowships', vars.fellowshipId, 'followups'] });
    },
  });
}

export function useDeleteFellowshipFollowup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      fellowshipId,
      followupId,
    }: {
      fellowshipId: string;
      followupId: string;
    }) => {
      const res = await api.fellowships.followups.delete(fellowshipId, followupId);
      return res.data!;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['fellowships', vars.fellowshipId, 'followups'] });
    },
  });
}

export function useFellowshipsMap() {
  return useQuery({
    queryKey: ['fellowships', 'map'],
    queryFn: async () => {
      const res = await api.fellowships.map();
      return res.data!;
    },
  });
}

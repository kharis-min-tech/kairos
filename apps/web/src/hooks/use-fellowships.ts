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

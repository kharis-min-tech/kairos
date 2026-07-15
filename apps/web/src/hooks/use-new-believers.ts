'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CreateEnrollmentRequest,
  UpdateEnrollmentRequest,
  RemoveEnrollmentRequest,
  EnrollmentListParams,
  BulkAdvanceEnrollmentsRequest,
  CreateNewBelieverSessionRequest,
  UpdateNewBelieverSessionRequest,
  RecordNewBelieverAttendanceRequest,
  SessionListParams,
  CreateMentorFollowupRequest,
} from '@kairos/types';

// ── Enrollment queries ─────────────────────────────────────

export function useEnrollments(
  params?: EnrollmentListParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['new-believers', 'enrollments', params],
    queryFn: async () => {
      const res = await api.newBelievers.enrollments.list(params);
      return res.data!;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useEnrollmentAlerts() {
  return useQuery({
    queryKey: ['new-believers', 'enrollments', 'alerts'],
    queryFn: async () => {
      const res = await api.newBelievers.enrollments.alerts();
      return res.data!;
    },
  });
}

export function useEnrollment(id: string) {
  return useQuery({
    queryKey: ['new-believers', 'enrollments', id],
    queryFn: async () => {
      const res = await api.newBelievers.enrollments.get(id);
      return res.data!;
    },
    enabled: !!id,
  });
}

export function useCreateEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateEnrollmentRequest) => {
      const res = await api.newBelievers.enrollments.create(data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['new-believers', 'enrollments'] }),
  });
}

export function useUpdateEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEnrollmentRequest }) => {
      const res = await api.newBelievers.enrollments.update(id, data);
      return res.data!;
    },
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ['new-believers', 'enrollments'] });
      qc.invalidateQueries({ queryKey: ['new-believers', 'enrollments', id] });
    },
  });
}

export function useRemoveEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RemoveEnrollmentRequest }) => {
      const res = await api.newBelievers.enrollments.remove(id, data);
      return res.data!;
    },
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ['new-believers', 'enrollments'] });
      qc.invalidateQueries({ queryKey: ['new-believers', 'enrollments', id] });
    },
  });
}

export function useBulkAdvanceEnrollments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: BulkAdvanceEnrollmentsRequest) => {
      const res = await api.newBelievers.enrollments.bulkAdvance(data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['new-believers', 'enrollments'] }),
  });
}

// ── Session queries ────────────────────────────────────────

export function useSessions(params?: SessionListParams) {
  return useQuery({
    queryKey: ['new-believers', 'sessions', params],
    queryFn: async () => {
      const res = await api.newBelievers.sessions.list(params);
      return res.data!;
    },
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateNewBelieverSessionRequest) => {
      const res = await api.newBelievers.sessions.create(data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['new-believers', 'sessions'] }),
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateNewBelieverSessionRequest }) => {
      const res = await api.newBelievers.sessions.update(id, data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['new-believers', 'sessions'] }),
  });
}

export function useSessionAttendance(sessionId: string) {
  return useQuery({
    queryKey: ['new-believers', 'sessions', sessionId, 'attendance'],
    queryFn: async () => {
      const res = await api.newBelievers.sessions.getAttendance(sessionId);
      return res.data!;
    },
    enabled: !!sessionId,
  });
}

// ── Programme-health insights ─────────────────────────────

export function useNewBelieversHealth(branchId?: string) {
  return useQuery({
    queryKey: ['new-believers', 'health', branchId],
    queryFn: async () => {
      const res = await api.newBelievers.health(branchId ? { branchId } : undefined);
      return res.data!;
    },
    staleTime: 60_000,
  });
}

// ── Caller hats (drives /new-believers tabs vs Kanban) ────

export function useMyNewBelieverHats(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['new-believers', 'me'],
    queryFn: async () => {
      const res = await api.newBelievers.me();
      return res.data!;
    },
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });
}

// ── Mentor follow-ups ─────────────────────────────────────

export function useMentorFollowups(enrollmentId: string) {
  return useQuery({
    queryKey: ['new-believers', 'enrollments', enrollmentId, 'mentor-followups'],
    queryFn: async () => {
      const res = await api.newBelievers.enrollments.listMentorFollowups(enrollmentId);
      return res.data!;
    },
    enabled: !!enrollmentId,
  });
}

export function useCreateMentorFollowup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      enrollmentId,
      data,
    }: {
      enrollmentId: string;
      data: CreateMentorFollowupRequest;
    }) => {
      const res = await api.newBelievers.enrollments.createMentorFollowup(enrollmentId, data);
      return res.data!;
    },
    onSuccess: (_res, { enrollmentId }) => {
      qc.invalidateQueries({ queryKey: ['new-believers', 'enrollments', enrollmentId, 'mentor-followups'] });
    },
  });
}

export function useDeleteMentorFollowup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ followupId }: { followupId: string; enrollmentId: string }) => {
      const res = await api.newBelievers.enrollments.deleteMentorFollowup(followupId);
      return res.data!;
    },
    onSuccess: (_res, { enrollmentId }) => {
      qc.invalidateQueries({ queryKey: ['new-believers', 'enrollments', enrollmentId, 'mentor-followups'] });
    },
  });
}

export function useRecordSessionAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      data,
    }: {
      sessionId: string;
      data: RecordNewBelieverAttendanceRequest;
    }) => {
      const res = await api.newBelievers.sessions.recordAttendance(sessionId, data);
      return res.data!;
    },
    onSuccess: (_res, { sessionId }) => {
      qc.invalidateQueries({ queryKey: ['new-believers', 'sessions', sessionId, 'attendance'] });
    },
  });
}

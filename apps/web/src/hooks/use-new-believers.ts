'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CreateEnrollmentRequest,
  UpdateEnrollmentRequest,
  EnrollmentListParams,
  CreateNewBelieverSessionRequest,
  RecordNewBelieverAttendanceRequest,
  SessionListParams,
} from '@kairos/types';

// ── Enrollment queries ─────────────────────────────────────

export function useEnrollments(params?: EnrollmentListParams) {
  return useQuery({
    queryKey: ['new-believers', 'enrollments', params],
    queryFn: async () => {
      const res = await api.newBelievers.enrollments.list(params);
      return res.data!;
    },
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

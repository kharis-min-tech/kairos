'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CreateMembershipCohortRequest,
  UpdateMembershipCohortRequest,
  UpsertMembershipSessionRequest,
  AssignMembershipTeacherRequest,
  EnrolMembersRequest,
  SaveMembershipSessionRecordsRequest,
  RecordFinalTestRequest,
  RecordInductionRequest,
  GraduateMembersRequest,
  WithdrawMembershipEnrollmentRequest,
  MembershipCohortStatus,
  MembershipEnrollmentStatus,
} from '@kairos/types';

// Membership cohorts are church-wide, so none of these take a branchId.

const KEY = 'membership';

// ── Queries ───────────────────────────────────────────────────────────────

export function useMembershipCohorts(params?: {
  status?: MembershipCohortStatus;
  enrolmentOpen?: boolean;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [KEY, 'cohorts', params],
    queryFn: async () => {
      const res = await api.membership.cohorts.list(params);
      return res.data!;
    },
  });
}

export function useMembershipCohort(id: string) {
  return useQuery({
    queryKey: [KEY, 'cohorts', id],
    queryFn: async () => {
      const res = await api.membership.cohorts.get(id);
      return res.data!;
    },
    enabled: !!id,
  });
}

export function useMembershipEnrollments(
  cohortId: string,
  params?: { status?: MembershipEnrollmentStatus; branchId?: string; search?: string },
) {
  return useQuery({
    queryKey: [KEY, 'cohorts', cohortId, 'enrollments', params],
    queryFn: async () => {
      const res = await api.membership.cohorts.enrollments(cohortId, params);
      return res.data!;
    },
    enabled: !!cohortId,
  });
}

export function useMembershipEnrollment(enrollmentId: string) {
  return useQuery({
    queryKey: [KEY, 'enrollments', enrollmentId],
    queryFn: async () => {
      const res = await api.membership.enrollments.get(enrollmentId);
      return res.data!;
    },
    enabled: !!enrollmentId,
  });
}

/** The caller's own progress. Never gated, so it is always safe to call. */
export function useMyMembership() {
  return useQuery({
    queryKey: [KEY, 'me'],
    queryFn: async () => {
      const res = await api.membership.me();
      return res.data!;
    },
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: [KEY] });
}

export function useCreateCohort() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (data: CreateMembershipCohortRequest) =>
      (await api.membership.cohorts.create(data)).data!,
    onSuccess: invalidate,
  });
}

export function useUpdateCohort(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (data: UpdateMembershipCohortRequest) =>
      (await api.membership.cohorts.update(id, data)).data!,
    onSuccess: invalidate,
  });
}

export function useArchiveCohort() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => (await api.membership.cohorts.archive(id)).data!,
    onSuccess: invalidate,
  });
}

export function useAssignTeacher(cohortId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (data: AssignMembershipTeacherRequest) =>
      (await api.membership.cohorts.assignTeacher(cohortId, data)).data!,
    onSuccess: invalidate,
  });
}

export function useRemoveTeacher(cohortId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (memberId: string) =>
      (await api.membership.cohorts.removeTeacher(cohortId, memberId)).data!,
    onSuccess: invalidate,
  });
}

export function useSaveSession(cohortId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (data: UpsertMembershipSessionRequest) =>
      (await api.membership.cohorts.saveSession(cohortId, data)).data!,
    onSuccess: invalidate,
  });
}

export function useEnrolSelf() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (cohortId: string) =>
      (await api.membership.cohorts.enrolSelf(cohortId)).data!,
    onSuccess: invalidate,
  });
}

export function useEnrolMembers(cohortId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (data: EnrolMembersRequest) =>
      (await api.membership.cohorts.enrolMembers(cohortId, data)).data!,
    onSuccess: invalidate,
  });
}

/** One write for the whole register: attendance plus homework and quiz. */
export function useSaveSessionRecords(sessionId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (data: SaveMembershipSessionRecordsRequest) =>
      (await api.membership.sessions.saveRecords(sessionId, data)).data!,
    onSuccess: invalidate,
  });
}

export function useRecordFinalTest() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (data: RecordFinalTestRequest) =>
      (await api.membership.recordFinalTest(data)).data!,
    onSuccess: invalidate,
  });
}

export function useRecordInduction(cohortId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (data: RecordInductionRequest) =>
      (await api.membership.cohorts.recordInduction(cohortId, data)).data!,
    onSuccess: invalidate,
  });
}

export function useGraduateMembers(cohortId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (data: GraduateMembersRequest) =>
      (await api.membership.cohorts.graduate(cohortId, data)).data!,
    onSuccess: invalidate,
  });
}

export function useWithdrawEnrollment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (args: {
      enrollmentId: string;
      data: WithdrawMembershipEnrollmentRequest;
    }) => (await api.membership.enrollments.withdraw(args.enrollmentId, args.data)).data!,
    onSuccess: invalidate,
  });
}

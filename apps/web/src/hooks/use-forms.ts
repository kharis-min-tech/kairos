'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  FormType,
  SubmitFormRequest,
  FormMemberSearchParams,
  ListFormSubmissionsParams,
  UpdateFormSubmissionRequest,
  ExportFormSubmissionsParams,
  ListDormantAttendeesParams,
  ArchiveAttendeesRequest,
} from '@kairos/types';

// ── Caller capabilities (drives /forms landing + filter gating) ──

export function useMyFormCapabilities() {
  return useQuery({
    queryKey: ['forms', 'me', 'capabilities'],
    queryFn: async () => {
      const res = await api.forms.myCapabilities();
      return res.data!;
    },
    staleTime: 60_000,
  });
}

// ── Submission (fill-out) mutation ─────────────────────────

export function useSubmitForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      formType,
      data,
    }: {
      formType: FormType;
      data: SubmitFormRequest;
    }) => {
      const res = await api.forms.submit(formType, data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  });
}

// ── Member typeahead (altar-call search-and-select) ────────

export function useFormMemberSearch(
  params: FormMemberSearchParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['forms', 'member-search', params],
    queryFn: async () => {
      const res = await api.forms.memberSearch(params);
      return res.data!;
    },
    enabled: (options?.enabled ?? true) && !!params.q && params.q.trim().length > 0,
  });
}

// ── Submission review queries ──────────────────────────────

export function useFormSubmissions(
  params?: ListFormSubmissionsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['forms', 'submissions', params],
    queryFn: async () => {
      const res = await api.forms.submissions.list(params);
      return res.data!;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useFormSubmission(id: string) {
  return useQuery({
    queryKey: ['forms', 'submissions', id],
    queryFn: async () => {
      const res = await api.forms.submissions.get(id);
      return res.data!;
    },
    enabled: !!id,
  });
}

export function useUpdateFormSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateFormSubmissionRequest;
    }) => {
      const res = await api.forms.submissions.update(id, data);
      return res.data!;
    },
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ['forms', 'submissions'] });
      qc.invalidateQueries({ queryKey: ['forms', 'submissions', id] });
    },
  });
}

export function useExportFormSubmissions() {
  return useMutation({
    mutationFn: async (params: ExportFormSubmissionsParams) => {
      return api.forms.submissions.exportCsv(params);
    },
  });
}

// ── Dormant attendees ──────────────────────────────────────

export function useDormantAttendees(
  params?: ListDormantAttendeesParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['forms', 'attendees', 'dormant', params],
    queryFn: async () => {
      const res = await api.forms.attendees.dormant(params);
      return res.data!;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useArchiveAttendees() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ArchiveAttendeesRequest) => {
      const res = await api.forms.attendees.archive(data);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms', 'attendees'] }),
  });
}

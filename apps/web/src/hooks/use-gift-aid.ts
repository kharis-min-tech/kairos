'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CaptureGiftAidDeclarationRequest,
  GiftAidDeclarationRequest,
  GiftAidListParams,
  GiftAidStatus,
  PublicGiftAidDeclarationRequest,
  RecordGiftAidWithdrawalRequest,
} from '@kairos/types';

const ME_KEY = ['gift-aid', 'me'] as const;
const ADMIN_KEY = ['gift-aid'] as const;

/** The caller's own declaration, history, and whether to offer "declare". */
export function useMyGiftAid() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async () => (await api.giftAid.me()).data!,
  });
}

/**
 * The declaration wording. Served by the API from the one shared renderer
 * rather than written into the page, so the text on screen is provably the
 * text that gets stored on the row.
 *
 * Cached hard: it only changes when the wording version is bumped, which is a
 * deploy.
 */
export function useGiftAidDeclarationText() {
  return useQuery({
    queryKey: ['gift-aid', 'declaration-text'],
    queryFn: async () => (await api.giftAid.declarationText()).data!,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

export function useDeclareGiftAid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: GiftAidDeclarationRequest) => (await api.giftAid.declare(data)).data!,
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_KEY }),
  });
}

export function useWithdrawGiftAid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data?: { notes?: string }) => (await api.giftAid.withdraw(data)).data!,
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_KEY }),
  });
}

/**
 * The public pre-rollout form. No auth, so this is the one mutation here that
 * works for a signed-out visitor; it invalidates nothing because there is no
 * cached state for someone who is not signed in.
 */
export function useSubmitPublicGiftAid() {
  return useMutation({
    mutationFn: async (data: PublicGiftAidDeclarationRequest) =>
      (await api.giftAid.submitPublic(data)).data!,
  });
}

// ── Admin ─────────────────────────────────────────────────

export function useGiftAidDeclarations(params?: GiftAidListParams) {
  return useQuery({
    queryKey: ['gift-aid', 'list', params],
    queryFn: async () => (await api.giftAid.list(params)).data!,
  });
}

export function useGiftAidDeclaration(id: string) {
  return useQuery({
    queryKey: ['gift-aid', id],
    queryFn: async () => (await api.giftAid.get(id)).data!,
    enabled: !!id,
  });
}

export function useCaptureGiftAidDeclaration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CaptureGiftAidDeclarationRequest) =>
      (await api.giftAid.capture(data)).data!,
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_KEY }),
  });
}

export function useMatchGiftAidDeclaration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, memberId }: { id: string; memberId: string }) =>
      (await api.giftAid.match(id, memberId)).data!,
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_KEY }),
  });
}

export function useRecordGiftAidWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: RecordGiftAidWithdrawalRequest & { id: string }) =>
      (await api.giftAid.recordWithdrawal(id, data)).data!,
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_KEY }),
  });
}

export function useMarkGiftAidInvalid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      (await api.giftAid.markInvalid(id, reason)).data!,
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_KEY }),
  });
}

export function useGiftAidRegister(params?: {
  from?: string;
  status?: GiftAidStatus;
  branchId?: string;
}) {
  return useQuery({
    queryKey: ['gift-aid', 'register', params],
    queryFn: async () => (await api.giftAid.register(params)).data!,
  });
}

/** The register as a CSV blob, for the caller to hand to a download. */
export function useExportGiftAidRegister() {
  return useMutation({
    mutationFn: async (params?: { from?: string; status?: GiftAidStatus; branchId?: string }) =>
      api.giftAid.registerCsv(params),
  });
}

/**
 * Member typeahead for the match control. Reuses the forms module's search
 * rather than adding a second one: it is already the app's "find a member by
 * name" endpoint and any logged-in member may call it.
 */
export function useGiftAidMemberSearch(q: string) {
  return useQuery({
    queryKey: ['gift-aid', 'member-search', q],
    queryFn: async () => (await api.forms.memberSearch({ q })).data!,
    enabled: q.trim().length >= 2,
  });
}

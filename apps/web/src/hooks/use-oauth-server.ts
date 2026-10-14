'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateOAuthClientRequest,
  OAuthAuthorizeParams,
  UpdateOAuthClientRequest,
} from '@kairos/types';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

/**
 * Kairos as an OAuth2 / OIDC authorization server: the consent screen, the
 * member's authorised apps, and the admin client registry.
 */

const CONNECTIONS_KEY = ['oauth-server', 'connections'] as const;
const CLIENTS_KEY = ['oauth-server', 'clients'] as const;
const clientKey = (id: string) => ['oauth-server', 'clients', id] as const;

// ── Consent screen ──────────────────────────────────────────

/** Validates the request and says whether the member must be asked. */
export function useAuthorizeContext(params: OAuthAuthorizeParams | null) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['oauth-server', 'authorize-context', params],
    queryFn: async () => {
      const res = await api.oauthServer.authorizeContext(params!);
      return res.data!;
    },
    enabled: !!accessToken && !!params,
    // A context is a one-shot validation of a specific request: never refetch
    // it in the background, and never serve a stale one for a new request.
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });
}

export function useAuthorizeDecision() {
  return useMutation({
    mutationFn: async ({ params, approve }: { params: OAuthAuthorizeParams; approve: boolean }) => {
      const res = await api.oauthServer.authorizeDecision(params, approve);
      return res.data!;
    },
  });
}

// ── The member's own authorised apps ────────────────────────

export function useMyAuthorizedApps() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: CONNECTIONS_KEY,
    queryFn: async () => (await api.oauthServer.listConnections()).data ?? [],
    enabled: !!accessToken,
  });
}

export function useRevokeAuthorizedApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (grantId: string) => api.oauthServer.revokeConnection(grantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: CONNECTIONS_KEY }),
  });
}

// ── Admin: client registry ──────────────────────────────────

export function useOAuthClients() {
  return useQuery({
    queryKey: CLIENTS_KEY,
    queryFn: async () => (await api.oauthServer.clients.list()).data ?? [],
  });
}

export function useOAuthClient(id: string) {
  return useQuery({
    queryKey: clientKey(id),
    queryFn: async () => (await api.oauthServer.clients.get(id)).data!,
    enabled: !!id,
  });
}

export function useOAuthClientGrants(id: string) {
  return useQuery({
    queryKey: [...clientKey(id), 'grants'],
    queryFn: async () => (await api.oauthServer.clients.grants(id)).data ?? [],
    enabled: !!id,
  });
}

export function useOAuthClientActivity(id: string) {
  return useQuery({
    queryKey: [...clientKey(id), 'activity'],
    queryFn: async () => (await api.oauthServer.clients.activity(id)).data ?? [],
    enabled: !!id,
  });
}

export function useCreateOAuthClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateOAuthClientRequest) => (await api.oauthServer.clients.create(data)).data!,
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENTS_KEY }),
  });
}

export function useUpdateOAuthClient(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateOAuthClientRequest) => (await api.oauthServer.clients.update(id, data)).data!,
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENTS_KEY }),
  });
}

export function useRotateOAuthClientSecret(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.oauthServer.clients.rotateSecret(id)).data!,
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENTS_KEY }),
  });
}

export function useExpirePreviousOAuthSecret(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.oauthServer.clients.expirePreviousSecret(id)).data!,
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENTS_KEY }),
  });
}

export function useRevokeAllOAuthGrants(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.oauthServer.clients.revokeAll(id)).data!,
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENTS_KEY }),
  });
}

export function useDeleteOAuthClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.oauthServer.clients.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENTS_KEY }),
  });
}

// ── Discovery (shown to admins so a client can be configured from one place) ──

export interface OAuthDiscovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  revocation_endpoint: string;
}

export function useOAuthDiscovery() {
  return useQuery({
    queryKey: ['oauth-server', 'discovery'],
    queryFn: async (): Promise<OAuthDiscovery> => {
      const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${base.replace(/\/$/, '')}/api/oauth/.well-known/openid-configuration`);
      if (!res.ok) throw new Error('Could not load the discovery document');
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
  });
}

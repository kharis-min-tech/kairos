'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OAuthConnection, OAuthProviderId } from '@kairos/types';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

const KEY = ['oauth-connections'] as const;

/**
 * List the caller's linked OAuth providers. Gated on `accessToken` so the
 * hook stays quiet on unauthenticated pages that import it via the shared
 * security-settings surface.
 */
export function useMyOAuthConnections() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery<OAuthConnection[]>({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.auth.oauth.listConnections();
      return res.data ?? [];
    },
    enabled: !!accessToken,
  });
}

/**
 * Detach a provider from the caller's account. The API returns 422 with the
 * message "You can't disconnect your only sign-in method. Set a password
 * first." on the lockout guard — surfaced verbatim via `error.message` so the
 * page can render it inline. Success invalidates the list query.
 */
export function useDisconnectOAuthProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (provider: OAuthProviderId) => {
      const res = await api.auth.oauth.disconnect(provider);
      return res.data ?? [];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

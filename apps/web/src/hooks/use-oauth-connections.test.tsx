import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useMyOAuthConnections, useDisconnectOAuthProvider } from './use-oauth-connections';
import { useAuthStore } from '@/lib/auth-store';

vi.mock('@/lib/api', () => ({
  api: {
    auth: {
      oauth: {
        listConnections: vi.fn(),
        disconnect: vi.fn(),
      },
    },
  },
}));

import { api } from '@/lib/api';

const mockConnection = {
  provider: 'google' as const,
  providerEmail: 'jane@example.com',
  connectedAt: '2026-08-01T10:00:00.000Z',
  lastUsedAt: '2026-08-18T09:00:00.000Z',
};

function createWrapper(qc?: QueryClient) {
  const client =
    qc ??
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    accessToken: 'test-access-token',
    refreshToken: null,
    user: null,
    activeRole: null,
    scope: null,
    mustChangePassword: false,
    branchSystemAdminBranchIds: [],
    branchDataAdminBranchIds: [],
  });
});

describe('useMyOAuthConnections', () => {
  it('calls api.auth.oauth.listConnections with the correct query key', async () => {
    vi.mocked(api.auth.oauth.listConnections).mockResolvedValue({
      data: [mockConnection],
    } as never);

    const { result } = renderHook(() => useMyOAuthConnections(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.auth.oauth.listConnections).toHaveBeenCalled();
    expect(result.current.data).toEqual([mockConnection]);
  });

  it('stays idle when the caller is not signed in', () => {
    useAuthStore.setState({ accessToken: null });
    const { result } = renderHook(() => useMyOAuthConnections(), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(api.auth.oauth.listConnections).not.toHaveBeenCalled();
  });

  it('returns an empty array when the API returns no data', async () => {
    vi.mocked(api.auth.oauth.listConnections).mockResolvedValue({} as never);
    const { result } = renderHook(() => useMyOAuthConnections(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe('useDisconnectOAuthProvider', () => {
  it('calls api.auth.oauth.disconnect with the provider id', async () => {
    vi.mocked(api.auth.oauth.disconnect).mockResolvedValue({ data: [] } as never);

    const { result } = renderHook(() => useDisconnectOAuthProvider(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('google');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.auth.oauth.disconnect).toHaveBeenCalledWith('google');
  });

  it('invalidates the oauth-connections query on success', async () => {
    vi.mocked(api.auth.oauth.disconnect).mockResolvedValue({ data: [] } as never);

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useDisconnectOAuthProvider(), {
      wrapper: createWrapper(qc),
    });

    await act(async () => {
      result.current.mutate('microsoft');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = invalidateSpy.mock.calls.map((c) => (c[0] as { queryKey: unknown[] }).queryKey);
    expect(keys).toContainEqual(['oauth-connections']);
  });

  it('propagates the API lockout error message verbatim', async () => {
    vi.mocked(api.auth.oauth.disconnect).mockRejectedValue(
      new Error("You can't disconnect your only sign-in method. Set a password first."),
    );

    const { result } = renderHook(() => useDisconnectOAuthProvider(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('google');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe(
      "You can't disconnect your only sign-in method. Set a password first.",
    );
  });
});

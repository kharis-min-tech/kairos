import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useAdminDashboard, useBranchDashboard, useMemberDashboard } from './use-dashboard';

vi.mock('@/lib/api', () => ({
  api: {
    analytics: {
      adminStats: vi.fn(),
      branchStats: vi.fn(),
      memberStats: vi.fn(),
    },
  },
}));

import { api } from '@/lib/api';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── useAdminDashboard ──────────────────────────────────────

describe('useAdminDashboard', () => {
  it('calls api.analytics.adminStats and returns data', async () => {
    const mockStats = { totalBranches: 5, totalMembers: 120, totalFellowships: 15 };
    vi.mocked(api.analytics.adminStats).mockResolvedValue({ data: mockStats } as never);

    const { result } = renderHook(() => useAdminDashboard(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.analytics.adminStats).toHaveBeenCalled();
    expect(result.current.data).toEqual(mockStats);
  });

  it('surfaces error on rejection', async () => {
    vi.mocked(api.analytics.adminStats).mockRejectedValue(new Error('Forbidden'));

    const { result } = renderHook(() => useAdminDashboard(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Forbidden');
  });
});

// ── useBranchDashboard ─────────────────────────────────────

describe('useBranchDashboard', () => {
  it('calls api.analytics.branchStats and returns data', async () => {
    const mockStats = { totalMembers: 35, totalFellowships: 4, recentMeetings: 12, pendingApprovals: 3 };
    vi.mocked(api.analytics.branchStats).mockResolvedValue({ data: mockStats } as never);

    const { result } = renderHook(() => useBranchDashboard(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.analytics.branchStats).toHaveBeenCalled();
    expect(result.current.data).toEqual(mockStats);
  });
});

// ── useMemberDashboard ─────────────────────────────────────

describe('useMemberDashboard', () => {
  it('calls api.analytics.memberStats and returns data', async () => {
    const mockStats = { fellowshipsJoined: 2, recentAttendance: { total: 10, present: 8, rate: 80 } };
    vi.mocked(api.analytics.memberStats).mockResolvedValue({ data: mockStats } as never);

    const { result } = renderHook(() => useMemberDashboard(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.analytics.memberStats).toHaveBeenCalled();
    expect(result.current.data).toEqual(mockStats);
  });

  it('surfaces error on rejection', async () => {
    vi.mocked(api.analytics.memberStats).mockRejectedValue(new Error('Unauthorized'));

    const { result } = renderHook(() => useMemberDashboard(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Unauthorized');
  });
});

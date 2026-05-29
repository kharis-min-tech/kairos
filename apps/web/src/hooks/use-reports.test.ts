import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useMemberGrowth, useAttendanceTrend } from './use-reports';

vi.mock('@/lib/api', () => ({
  api: {
    reports: {
      memberGrowth: vi.fn(),
      attendanceTrend: vi.fn(),
    },
  },
}));

// member-growth and attendance-trend hooks only fire when the active role is
// admin or pastor — drive that via a controllable auth-store mock.
let mockActiveRole: string | null = 'admin';
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector?: (s: { activeRole: string | null }) => unknown) => {
    const state = { activeRole: mockActiveRole };
    return selector ? selector(state) : state;
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
  mockActiveRole = 'admin';
});

// ── useMemberGrowth ────────────────────────────────────────

describe('useMemberGrowth', () => {
  it('calls api.reports.memberGrowth and returns data', async () => {
    const mockGrowth = [
      { month: '2024-01', newSignups: 5 },
      { month: '2024-02', newSignups: 8 },
    ];
    vi.mocked(api.reports.memberGrowth).mockResolvedValue({ data: mockGrowth } as never);

    const { result } = renderHook(() => useMemberGrowth(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.reports.memberGrowth).toHaveBeenCalled();
    expect(result.current.data).toEqual(mockGrowth);
  });

  it('surfaces error on rejection', async () => {
    vi.mocked(api.reports.memberGrowth).mockRejectedValue(new Error('Forbidden'));

    const { result } = renderHook(() => useMemberGrowth(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Forbidden');
  });
});

// ── useAttendanceTrend ─────────────────────────────────────

describe('useAttendanceTrend', () => {
  it('calls api.reports.attendanceTrend and returns data', async () => {
    const mockTrend = [
      { week: '2024-05-27', rate: 85 },
      { week: '2024-06-03', rate: 90 },
    ];
    vi.mocked(api.reports.attendanceTrend).mockResolvedValue({ data: mockTrend } as never);

    const { result } = renderHook(() => useAttendanceTrend(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.reports.attendanceTrend).toHaveBeenCalled();
    expect(result.current.data).toEqual(mockTrend);
  });

  it('surfaces error on rejection', async () => {
    vi.mocked(api.reports.attendanceTrend).mockRejectedValue(new Error('Forbidden'));

    const { result } = renderHook(() => useAttendanceTrend(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Forbidden');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useMemberGrowth, useAttendanceTrend, useFellowshipStats, useOutreachOverview, useOutreachAnalytics } from './use-reports';

vi.mock('@/lib/api', () => ({
  api: {
    reports: {
      memberGrowth: vi.fn(),
      attendanceTrend: vi.fn(),
    },
    analytics: {
      fellowshipStats: vi.fn(),
    },
    dashboard: {
      overview: vi.fn(),
      analytics: vi.fn(),
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

// ── useFellowshipStats / outreach hooks (added by PR #36, were untested) ──

describe('useFellowshipStats', () => {
  it('returns fellowship stats for any authenticated role', async () => {
    const stats = { totalBranches: 3, totalMembers: 150, totalFellowships: 20, attendanceRate: 70, attendanceBreakdown: { present: 70, late: 10, absent: 15, excused: 5, total: 100 }, engagement: 'High' };
    vi.mocked(api.analytics.fellowshipStats).mockResolvedValue({ data: stats } as never);

    const { result } = renderHook(() => useFellowshipStats(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.analytics.fellowshipStats).toHaveBeenCalled();
    expect(result.current.data?.engagement).toBe('High');
  });
});

describe('useOutreachOverview', () => {
  it('returns the souls RAG overview', async () => {
    const overview = { totalSouls: 42, ragCounts: { RED: 5, AMBER: 12, GREEN: 25 }, statusCounts: {}, criticalCount: 5, monitorCount: 12, allGoodCount: 25 };
    vi.mocked(api.dashboard.overview).mockResolvedValue({ data: overview } as never);

    const { result } = renderHook(() => useOutreachOverview(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.dashboard.overview).toHaveBeenCalled();
    expect(result.current.data?.totalSouls).toBe(42);
  });
});

describe('useOutreachAnalytics', () => {
  it('returns the outreach conversion analytics', async () => {
    const analytics = { overview: { totalSouls: 42, converted: 10, conversionRate: 24, avgDaysToConversion: 30, activeFollowUps: 8 }, conversionFunnel: {}, statusDistribution: {}, responseRates: [] };
    vi.mocked(api.dashboard.analytics).mockResolvedValue({ data: analytics } as never);

    const { result } = renderHook(() => useOutreachAnalytics(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.dashboard.analytics).toHaveBeenCalled();
    expect(result.current.data?.overview.converted).toBe(10);
  });
});

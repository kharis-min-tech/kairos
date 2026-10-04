import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/**
 * Regression, 2026-10-04: the page gated on `activeRole` against
 * ['admin', 'pastor', 'leader']. SystemRole has only been 'admin' | 'member'
 * since the RBAC rebuild, so a branch pastor — systemRole 'member', authority
 * in grants — was redirected straight back to /attendance. Clicking "Reports"
 * looked like it did nothing.
 */

const replace = vi.fn();
let capabilities: string[] = [];
const authState = { activeRole: 'member' as string | null, user: { homeBranchId: 'b-1' } };

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: <T,>(selector?: (s: typeof authState) => T) =>
    selector ? selector(authState) : (authState as unknown as T),
}));

vi.mock('@/hooks/use-capabilities', () => ({
  useCapabilities: () => ({ has: (cap: string) => capabilities.includes(cap) }),
}));

vi.mock('@/hooks/use-branches', () => ({ useBranches: () => ({ data: [] }) }));
vi.mock('@/hooks/use-departments', () => ({ useDepartments: () => ({ data: [] }) }));
vi.mock('@/hooks/use-fellowships', () => ({ useFellowships: () => ({ data: { data: [] } }) }));
vi.mock('@/hooks/use-attendance', () => ({
  useAttendanceTrends: () => ({ data: undefined, isLoading: false }),
  useMissingMembers: () => ({ data: undefined, isLoading: false }),
  useAttendanceByBranch: () => ({ data: undefined, isLoading: false }),
}));

// The chart cards each pull their own hooks; the guard is what's under test.
vi.mock('../_components/cohort-compare-card', () => ({ CohortCompareCard: () => <div /> }));
vi.mock('../_components/attendance-heatmap-card', () => ({
  AttendanceHeatmapCard: () => <div />,
}));
vi.mock('../_components/frequency-buckets-card', () => ({
  FrequencyBucketsCard: () => <div />,
}));
vi.mock('../_components/first-time-returning-card', () => ({
  FirstTimeReturningCard: () => <div />,
}));

import AttendanceReportsPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  authState.activeRole = 'member';
});

describe('AttendanceReportsPage — report-reader guard', () => {
  it('lets a branch pastor in — systemRole member, authority from branch:read', () => {
    capabilities = ['branch:read', 'branch:write'];
    render(<AttendanceReportsPage />, { wrapper });
    expect(replace).not.toHaveBeenCalled();
  });

  it('lets a fellowship leader in', () => {
    capabilities = ['fellowship:read'];
    render(<AttendanceReportsPage />, { wrapper });
    expect(replace).not.toHaveBeenCalled();
  });

  it('lets a department lead in', () => {
    capabilities = ['department:read'];
    render(<AttendanceReportsPage />, { wrapper });
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects a plain member with no grants', () => {
    capabilities = [];
    render(<AttendanceReportsPage />, { wrapper });
    expect(replace).toHaveBeenCalledWith('/attendance');
  });
});

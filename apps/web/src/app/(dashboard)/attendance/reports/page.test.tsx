import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

let authState: { activeRole: string | null } = { activeRole: 'admin' };
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector?: (s: typeof authState) => unknown) =>
    selector ? selector(authState) : authState,
}));

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
}));

vi.mock('@/hooks/use-branches', () => ({ useBranches: () => ({ data: [] }) }));
vi.mock('@/hooks/use-departments', () => ({ useDepartments: () => ({ data: { data: [] } }) }));
vi.mock('@/hooks/use-fellowships', () => ({ useFellowships: () => ({ data: { data: [] } }) }));

let trends: { data?: unknown[]; isLoading: boolean; isError: boolean; error: null } = {
  data: [],
  isLoading: false,
  isError: false,
  error: null,
};
let missing: { data?: unknown[]; isLoading: boolean; isError: boolean; error: null } = {
  data: [],
  isLoading: false,
  isError: false,
  error: null,
};
let byBranch: { data?: unknown[]; isLoading: boolean; isError: boolean; error: null } = {
  data: [],
  isLoading: false,
  isError: false,
  error: null,
};

vi.mock('@/hooks/use-attendance', () => ({
  useAttendanceTrends: () => trends,
  useMissingMembers: () => missing,
  useAttendanceByBranch: () => byBranch,
  // v2 tiles: heatmap + frequency + first-time/returning. Default to empty
  // successful responses so the page renders its "no data" states.
  useAttendanceHeatmap: () => ({
    data: { services: [], members: [] },
    isLoading: false,
    isError: false,
    error: null,
  }),
  useFrequencyBuckets: () => ({
    data: { windowMonths: 3, servicesConsidered: 0, engagedMembers: 0, buckets: [] },
    isLoading: false,
    isError: false,
    error: null,
  }),
  useFirstTimeReturning: () => ({ data: [], isLoading: false, isError: false, error: null }),
  // CohortCompareCard renders inside this page; stub its hooks too.
  useServices: () => ({ data: { data: [], total: 0, page: 1, limit: 100 }, isLoading: false, isError: false, error: null }),
  useCohortDiff: () => ({
    data: undefined,
    isSuccess: false,
    isError: false,
    isPending: false,
    error: null,
    mutateAsync: vi.fn(),
    reset: vi.fn(),
  }),
}));

// Recharts' ResponsiveContainer needs layout; stub the chart pieces.
vi.mock('recharts', () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    LineChart: Stub,
    Line: Stub,
    BarChart: Stub,
    Bar: Stub,
    ResponsiveContainer: Stub,
    XAxis: Stub,
    YAxis: Stub,
    CartesianGrid: Stub,
    Tooltip: Stub,
    Legend: Stub,
  };
});

import AttendanceReportsPage from './page';

beforeEach(() => {
  trends = { data: [], isLoading: false, isError: false, error: null };
  missing = { data: [], isLoading: false, isError: false, error: null };
  byBranch = { data: [], isLoading: false, isError: false, error: null };
});

describe('AttendanceReportsPage', () => {
  beforeEach(() => {
    authState.activeRole = 'admin';
    replace.mockClear();
  });

  it('renders empty states when there is no data', () => {
    render(<AttendanceReportsPage />);
    expect(screen.getByText(/No attendance recorded yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Everyone attended the most recent service/i)).toBeInTheDocument();
    expect(screen.getByText(/No branch data yet/i)).toBeInTheDocument();
  });

  it('renders report data', () => {
    trends = {
      data: [{ weekStart: '2026-05-18', attendees: 120, distinctAttendees: 100, serviceCount: 2 }],
      isLoading: false,
      isError: false,
      error: null,
    };
    missing = {
      data: [{ memberId: 'm1', firstName: 'Ada', lastName: 'Lovelace', servicesConsidered: 4, missedStreak: 2 }],
      isLoading: false,
      isError: false,
      error: null,
    };
    byBranch = {
      data: [
        {
          branchId: 'b1',
          branchName: 'London',
          activeMembers: 100,
          engagedMembers: 60,
          distinctAttendees: 48,
          attendanceRate: 0.8,
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    };
    render(<AttendanceReportsPage />);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('London')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('redirects a member away from the reports page', async () => {
    authState = { activeRole: 'member' };
    render(<AttendanceReportsPage />);
    // useEffect runs synchronously in React 18+ test env after render
    await Promise.resolve();
    expect(replace).toHaveBeenCalledWith('/attendance');
  });

  it('allows a leader to view the reports page', async () => {
    authState = { activeRole: 'leader' };
    render(<AttendanceReportsPage />);
    await Promise.resolve();
    expect(replace).not.toHaveBeenCalled();
  });
});

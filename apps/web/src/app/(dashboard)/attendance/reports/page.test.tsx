import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const authState = { activeRole: 'admin' };
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector?: (s: typeof authState) => unknown) =>
    selector ? selector(authState) : authState,
}));

vi.mock('@/hooks/use-branches', () => ({ useBranches: () => ({ data: [] }) }));

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
}));

// Recharts' ResponsiveContainer needs layout; stub the chart pieces.
vi.mock('recharts', () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    LineChart: Stub,
    Line: Stub,
    ResponsiveContainer: Stub,
    XAxis: Stub,
    YAxis: Stub,
    CartesianGrid: Stub,
    Tooltip: Stub,
  };
});

import AttendanceReportsPage from './page';

beforeEach(() => {
  trends = { data: [], isLoading: false, isError: false, error: null };
  missing = { data: [], isLoading: false, isError: false, error: null };
  byBranch = { data: [], isLoading: false, isError: false, error: null };
});

describe('AttendanceReportsPage', () => {
  it('renders empty states when there is no data', () => {
    render(<AttendanceReportsPage />);
    expect(screen.getByText(/No attendance recorded yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Everyone has been seen recently/i)).toBeInTheDocument();
    expect(screen.getByText(/No branch data yet/i)).toBeInTheDocument();
  });

  it('renders report data', () => {
    trends = {
      data: [{ weekStart: '2026-05-18', attendees: 120, serviceCount: 2 }],
      isLoading: false,
      isError: false,
      error: null,
    };
    missing = {
      data: [{ memberId: 'm1', firstName: 'Ada', lastName: 'Lovelace', servicesConsidered: 4 }],
      isLoading: false,
      isError: false,
      error: null,
    };
    byBranch = {
      data: [
        { branchId: 'b1', branchName: 'London', activeMembers: 100, distinctAttendees: 80, attendanceRate: 0.8 },
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
});

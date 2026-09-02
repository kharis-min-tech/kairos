import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// ── Mutable mock state ─────────────────────────────────────

type LeadershipFixture = {
  branchSystemAdminBranchIds: string[];
  branchDataAdminBranchIds: string[];
  leadFellowships: Array<{ id: string; fellowshipName: string; branchId: string }>;
  coLeadFellowships: Array<{ id: string; fellowshipName: string; branchId: string }>;
  leadDepartments: Array<{ id: string; departmentName: string; branchId: string }>;
  deputyDepartments: Array<{ id: string; departmentName: string; branchId: string }>;
};

const emptyLeadership: LeadershipFixture = {
  branchSystemAdminBranchIds: [],
  branchDataAdminBranchIds: [],
  leadFellowships: [],
  coLeadFellowships: [],
  leadDepartments: [],
  deputyDepartments: [],
};

type Scope =
  | { kind: 'branch'; id: string }
  | { kind: 'fellowship'; id: string }
  | { kind: 'department'; id: string }
  | null;

let authState: {
  user: { id: string; firstName: string; homeBranchId?: string } | null;
  activeRole: string | null;
  scope: Scope;
  branchSystemAdminBranchIds: string[];
  branchDataAdminBranchIds: string[];
  setBranchAdminAuthority: (a: unknown) => void;
} = {
  user: { id: 'u-1', firstName: 'Pat', homeBranchId: 'b-1' },
  activeRole: 'member',
  scope: null,
  branchSystemAdminBranchIds: [],
  branchDataAdminBranchIds: [],
  setBranchAdminAuthority: vi.fn(),
};

let leadershipData: LeadershipFixture | null = emptyLeadership;

// ── Mocks ──────────────────────────────────────────────────

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: <T,>(selector?: (s: typeof authState) => T) =>
    selector ? selector(authState) : (authState as unknown as T),
}));

vi.mock('@/hooks/use-me', () => ({
  useMyLeadership: () => ({ data: leadershipData, isLoading: false, isSuccess: true }),
}));

vi.mock('@/hooks/use-reports', () => ({
  useMemberGrowth: () => ({ data: [], isLoading: false }),
  useAttendanceTrend: () => ({ data: [], isLoading: false }),
  useOutreachOverview: () => ({ data: { totalSouls: 0 }, isLoading: false }),
  useOutreachAnalytics: () => ({
    data: {
      overview: { totalSouls: 0, converted: 0, activeFollowUps: 0, conversionRate: 0, avgDaysToConversion: 0 },
      conversionFunnel: {},
      statusDistribution: {},
    },
  }),
}));

vi.mock('@/hooks/use-dashboard', () => ({
  useMemberDashboard: () => ({
    data: {
      fellowshipsJoined: 1,
      fellowships: [{ fellowshipId: 'f-1', fellowshipName: 'Youth', fellowshipType: 'youth' }],
      recentAttendance: { total: 4, present: 3, late: 0, absent: 1, rate: 75 },
    },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/use-fellowships', () => ({
  useFellowships: () => ({ data: { data: [] } }),
  useFellowshipStats: () => ({
    data: {
      fellowship: { id: 'f-1', name: 'Youth', branchName: 'Central' },
      members: { total: 12, active: 10, inactive: 2 },
      meetings: {
        last90d: 4,
        byWeek: [{ week: '2024-06-03', count: 2 }, { week: '2024-06-10', count: 2 }],
      },
      followups: { total: 6, open: 3, closed: 3 },
      joinRequests: { recent30d: 5, pending: 1 },
    },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/use-departments', () => ({
  useDepartmentMembers: () => ({ data: [], isLoading: false }),
  useDepartmentJoinRequests: () => ({ data: [], isLoading: false }),
  useDepartmentFollowups: () => ({ data: [], isLoading: false }),
  useDepartmentRotaStats: () => ({
    data: {
      branchDepartmentId: 'd-1',
      windowDays: 28,
      upcomingCount: 6,
      publishedCount: 4,
      draftCount: 2,
    },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/use-attendance', () => ({
  useMyAttendance: () => ({
    data: {
      windowWeeks: 8,
      servicesInWindow: 0,
      attendedCount: 0,
      rate: 0,
      presentOnTimeCount: 0,
      lateCount: 0,
      virtualCount: 0,
      missedCount: 0,
      currentStreak: { kind: 'attended', length: 0 },
      lastAttendedAt: null,
      lastService: null,
      history: [],
    },
    isLoading: false,
  }),
  useDepartmentAttendance: () => ({
    data: {
      department: { id: 'd-1', name: 'Worship', branchName: 'Central' },
      windowWeeks: 12,
      totalServices: 8,
      distinctAttendees: 5,
      activeMembers: 10,
      rate: 0.5,
      members: [],
      trend: [{ weekStart: '2024-05-27T00:00:00.000Z', attendees: 4 }],
    },
    isLoading: false,
  }),
}));

// useQuery is only used for the souls-tab inline call; we mock @tanstack/react-query
// minimally to avoid hitting api.souls.list (the souls tab only renders for the
// outreach sub-tab inside the leadership branch panel).
vi.mock('@/lib/api', () => ({
  api: {
    souls: { list: vi.fn().mockResolvedValue({ data: { data: [] } }) },
    fellowships: { meetings: { list: vi.fn().mockResolvedValue({ data: [] }) } },
  },
}));

import ReportsPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function resetState() {
  authState = {
    user: { id: 'u-1', firstName: 'Pat', homeBranchId: 'b-1' },
    activeRole: 'member',
    scope: null,
    branchSystemAdminBranchIds: [],
    branchDataAdminBranchIds: [],
    setBranchAdminAuthority: vi.fn(),
  };
  leadershipData = emptyLeadership;
}

// ── Tab visibility ─────────────────────────────────────────

describe('ReportsPage — persona tab visibility', () => {
  beforeEach(resetState);

  it('plain member: shows no persona tabs at all', () => {
    render(<ReportsPage />, { wrapper });
    expect(screen.queryByRole('tab', { name: 'My Branch' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'My Fellowship' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'My Department' })).not.toBeInTheDocument();
  });

  it('system admin: shows only "My Branch" (no other personas) → single tab is suppressed', () => {
    authState.activeRole = 'admin';
    render(<ReportsPage />, { wrapper });
    // With a single available persona we hide the tab row to avoid noise.
    expect(screen.queryByRole('tab', { name: 'My Branch' })).not.toBeInTheDocument();
  });
  it('branch system admin: shows "My Branch" tab (BSA from leadership data)', () => {
    authState.activeRole = 'leader';
    leadershipData = {
      ...emptyLeadership,
      branchSystemAdminBranchIds: ['b-1'],
      leadFellowships: [{ id: 'f-1', fellowshipName: 'Youth', branchId: 'b-1' }],
    };
    render(<ReportsPage />, { wrapper });
    expect(screen.getByRole('tab', { name: 'My Branch' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'My Fellowship' })).toBeInTheDocument();
  });

  it('fellowship lead + department lead (no branch authority): shows both leader tabs', () => {
    authState.activeRole = 'leader';
    leadershipData = {
      ...emptyLeadership,
      leadFellowships: [{ id: 'f-1', fellowshipName: 'Youth', branchId: 'b-1' }],
      leadDepartments: [{ id: 'd-1', departmentName: 'Worship', branchId: 'b-1' }],
    };
    render(<ReportsPage />, { wrapper });
    expect(screen.queryByRole('tab', { name: 'My Branch' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'My Fellowship' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'My Department' })).toBeInTheDocument();
  });

  it('full polyhydra (BSA + fellowship + department): shows all three tabs', () => {
    authState.activeRole = 'leader';
    leadershipData = {
      branchSystemAdminBranchIds: ['b-1'],
      branchDataAdminBranchIds: [],
      leadFellowships: [{ id: 'f-1', fellowshipName: 'Youth', branchId: 'b-1' }],
      coLeadFellowships: [],
      leadDepartments: [{ id: 'd-1', departmentName: 'Worship', branchId: 'b-1' }],
      deputyDepartments: [],
    };
    render(<ReportsPage />, { wrapper });
    expect(screen.getByRole('tab', { name: 'My Branch' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'My Fellowship' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'My Department' })).toBeInTheDocument();
  });
});

// ── Tab switching ──────────────────────────────────────────

describe('ReportsPage — tab switching', () => {
  beforeEach(resetState);

  it('clicking "My Department" switches the active panel', () => {
    authState.activeRole = 'leader';
    leadershipData = {
      ...emptyLeadership,
      leadFellowships: [{ id: 'f-1', fellowshipName: 'Youth', branchId: 'b-1' }],
      leadDepartments: [{ id: 'd-1', departmentName: 'Worship', branchId: 'b-1' }],
    };
    render(<ReportsPage />, { wrapper });

    // Fellowship is the default — the department attendance card is absent.
    expect(screen.queryByText('Service attendance per week')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'My Department' }));

    expect(screen.getByText('Service attendance per week')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'My Department' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('tab', { name: 'My Fellowship' }).getAttribute('aria-pressed')).toBe('false');
  });
});

// ── Fellowship picker (multi-fellowship leader) ────────────

describe('ReportsPage — fellowship picker', () => {
  beforeEach(resetState);

  it('does not show a picker when the user leads exactly one fellowship', () => {
    authState.activeRole = 'leader';
    leadershipData = {
      ...emptyLeadership,
      leadFellowships: [{ id: 'f-1', fellowshipName: 'Youth', branchId: 'b-1' }],
    };
    render(<ReportsPage />, { wrapper });
    expect(screen.queryByLabelText('Fellowship')).not.toBeInTheDocument();
  });

  it('shows a picker when the user leads multiple fellowships', () => {
    authState.activeRole = 'leader';
    leadershipData = {
      ...emptyLeadership,
      leadFellowships: [
        { id: 'f-1', fellowshipName: 'Youth', branchId: 'b-1' },
        { id: 'f-2', fellowshipName: 'Choir', branchId: 'b-1' },
      ],
    };
    render(<ReportsPage />, { wrapper });
    const picker = screen.getByLabelText('Fellowship') as HTMLSelectElement;
    expect(picker).toBeInTheDocument();
    expect(picker.value).toBe('f-1');
  });
});

// ── Department picker (multi-department leader) ────────────

describe('ReportsPage — department picker', () => {
  beforeEach(resetState);

  it('shows a picker when the user leads multiple departments', () => {
    authState.activeRole = 'leader';
    leadershipData = {
      ...emptyLeadership,
      leadDepartments: [
        { id: 'd-1', departmentName: 'Worship', branchId: 'b-1' },
        { id: 'd-2', departmentName: 'Media', branchId: 'b-1' },
      ],
    };
    render(<ReportsPage />, { wrapper });
    expect(screen.getByLabelText('Department')).toBeInTheDocument();
  });
});

// ── Department panel: service-attendance wire-up ─────────────────────

describe('ReportsPage — department service-attendance', () => {
  beforeEach(resetState);

  it('surfaces the rate% and roster summary from useDepartmentAttendance', () => {
    authState.activeRole = 'leader';
    leadershipData = {
      ...emptyLeadership,
      leadDepartments: [{ id: 'd-1', departmentName: 'Worship', branchId: 'b-1' }],
    };
    render(<ReportsPage />, { wrapper });

    // Mock returns rate: 0.5, distinctAttendees: 5, activeMembers: 10, totalServices: 8.
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('5/10 attended · 8 services')).toBeInTheDocument();
  });

  it('surfaces upcoming rota counts from useDepartmentRotaStats', () => {
    authState.activeRole = 'leader';
    leadershipData = {
      ...emptyLeadership,
      leadDepartments: [{ id: 'd-1', departmentName: 'Worship', branchId: 'b-1' }],
    };
    render(<ReportsPage />, { wrapper });

    // Mock returns upcomingCount: 6, publishedCount: 4, draftCount: 2.
    expect(screen.getByText('Upcoming rota')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('4 published · 2 draft')).toBeInTheDocument();
  });
});

// ── Phase 4: scope-aware persona tabs ────────────────────────────────
//
// /api/me/leadership now scope-filters its response. A user logged in as
// "Fellowship Leader, K-Groups Central" gets back a single-fellowship
// leadership shape, so the reports page should:
//   - show ONLY the "My Fellowship" tab,
//   - not show the picker (only one fellowship in the list),
//   - hide the branch + department tabs even if the user technically holds
//     authority over them.

describe('ReportsPage — scope-aware persona narrowing', () => {
  beforeEach(resetState);

  it('fellowship-scoped login: only "My Fellowship" tab (single-tab → row hidden), no picker', () => {
    authState.activeRole = 'leader';
    authState.scope = { kind: 'fellowship', id: 'f-1' };
    // Server narrows leadership to a single fellowship — empty everything else.
    leadershipData = {
      ...emptyLeadership,
      leadFellowships: [{ id: 'f-1', fellowshipName: 'K-Groups Central', branchId: 'b-1' }],
    };
    render(<ReportsPage />, { wrapper });

    // Single available persona → tab row is suppressed (existing pattern).
    expect(screen.queryByRole('tab', { name: 'My Branch' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'My Department' })).not.toBeInTheDocument();
    // Picker hidden — only one fellowship in the list.
    expect(screen.queryByLabelText('Fellowship')).not.toBeInTheDocument();
  });

  it('department-scoped login: only "My Department" surface, no other tabs', () => {
    authState.activeRole = 'leader';
    authState.scope = { kind: 'department', id: 'd-1' };
    leadershipData = {
      ...emptyLeadership,
      leadDepartments: [{ id: 'd-1', departmentName: 'Worship', branchId: 'b-1' }],
    };
    render(<ReportsPage />, { wrapper });

    expect(screen.queryByRole('tab', { name: 'My Branch' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'My Fellowship' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Department')).not.toBeInTheDocument();
  });

  it('branch-scoped login: only "My Branch" tab (single-tab → row hidden), other persona tabs absent', () => {
    authState.activeRole = 'leader';
    authState.scope = { kind: 'branch', id: 'b-1' };
    leadershipData = { ...emptyLeadership, branchSystemAdminBranchIds: ['b-1'] };
    render(<ReportsPage />, { wrapper });

    // Branch is the sole available tab — row hidden by the page's >1 guard.
    expect(screen.queryByRole('tab', { name: 'My Branch' })).not.toBeInTheDocument();
    // Other tabs definitively absent.
    expect(screen.queryByRole('tab', { name: 'My Fellowship' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'My Department' })).not.toBeInTheDocument();
  });
});

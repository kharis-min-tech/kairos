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
let leadershipLoading = false;

const branches = [
  { id: 'b-1', branchName: 'London' },
  { id: 'b-2', branchName: 'Accra' },
];

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
  useMyLeadership: () => ({ data: leadershipData, isLoading: leadershipLoading, isSuccess: !leadershipLoading }),
}));

vi.mock('@/hooks/use-dashboard', () => ({
  useAdminDashboard: () => ({
    data: {
      totalBranches: 3,
      totalMembers: 42,
      totalFellowships: 7,
      membersByApproval: [{ status: 'pending', count: 2 }],
    },
    isLoading: false,
  }),
  useBranchDashboard: () => ({
    data: { totalMembers: 12, totalFellowships: 3, recentMeetings: 4, pendingApprovals: 1 },
    isLoading: false,
  }),
  useMemberDashboard: () => ({
    data: {
      fellowshipsJoined: 1,
      fellowships: [{ fellowshipId: 'f-1', fellowshipName: 'Youth', fellowshipType: 'youth' }],
      recentAttendance: { total: 4, present: 3, late: 0, absent: 1, rate: 75 },
    },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/use-members', () => ({
  useMembers: () => ({ data: { data: [], meta: { total: 0 } } }),
}));

vi.mock('@/hooks/use-branches', () => ({
  useBranches: () => ({ data: branches, isLoading: false }),
}));

vi.mock('@/hooks/use-fellowships', () => ({
  useFellowships: () => ({ data: { data: [] } }),
}));

vi.mock('@/hooks/use-reports', () => ({
  useMemberGrowth: () => ({ data: [], isLoading: false }),
  useAttendanceTrend: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/use-attendance', () => ({
  useMyAttendance: () => ({
    data: {
      rate: 0,
      servicesInWindow: 0,
      attendedCount: 0,
      currentStreak: { length: 0, kind: 'attended' },
    },
    isLoading: false,
  }),
  useAttendanceSummary: () => ({ data: null, isLoading: false }),
  useAttendanceByBranch: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/use-new-believers', () => ({
  useNewBelieversHealth: () => ({ data: null, isLoading: false }),
  useEnrollments: () => ({ data: { data: [] }, isLoading: false }),
}));

import DashboardPage from './page';

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
  leadershipLoading = false;
}

describe('DashboardPage — role-label fork', () => {
  beforeEach(resetState);

  it('shows "Administrator" for system admin', () => {
    authState.activeRole = 'admin';
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });

  it('shows "Pastor" for pastor (even if also a fellowship leader)', () => {
    authState.activeRole = 'pastor';
    leadershipData = {
      ...emptyLeadership,
      leadFellowships: [{ id: 'f-1', fellowshipName: 'Youth', branchId: 'b-1' }],
    };
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('Pastor')).toBeInTheDocument();
  });

  it('shows "Branch System Admin — {branch}" when caller is BSA at home branch', () => {
    authState.activeRole = 'leader';
    leadershipData = { ...emptyLeadership, branchSystemAdminBranchIds: ['b-1'] };
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('Branch System Admin — London')).toBeInTheDocument();
  });

  it('shows "Branch Data Admin" when BDA only (no BSA)', () => {
    authState.activeRole = 'leader';
    leadershipData = { ...emptyLeadership, branchDataAdminBranchIds: ['b-1'] };
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('Branch Data Admin — London')).toBeInTheDocument();
  });

  it('shows "Fellowship Leader — {name}" for a fellowship-only leader', () => {
    authState.activeRole = 'leader';
    leadershipData = {
      ...emptyLeadership,
      leadFellowships: [{ id: 'f-1', fellowshipName: 'Youth', branchId: 'b-1' }],
    };
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('Fellowship Leader — Youth')).toBeInTheDocument();
  });

  it('shows "Department Lead — {name}" for a department-only leader', () => {
    authState.activeRole = 'leader';
    leadershipData = {
      ...emptyLeadership,
      leadDepartments: [{ id: 'd-1', departmentName: 'Worship', branchId: 'b-1' }],
    };
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('Department Lead — Worship')).toBeInTheDocument();
  });

  it('shows "Fellowship & Department Lead" for the dual case', () => {
    authState.activeRole = 'leader';
    leadershipData = {
      ...emptyLeadership,
      leadFellowships: [{ id: 'f-1', fellowshipName: 'Youth', branchId: 'b-1' }],
      leadDepartments: [{ id: 'd-1', departmentName: 'Worship', branchId: 'b-1' }],
    };
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('Fellowship & Department Lead')).toBeInTheDocument();
  });

  it('shows "Member" for a plain member with no leadership', () => {
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('Member')).toBeInTheDocument();
  });

  it('falls back to "Leader" for activeRole=leader with no specific leadership', () => {
    authState.activeRole = 'leader';
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('Leader')).toBeInTheDocument();
  });
});

describe('DashboardPage — stats fork', () => {
  beforeEach(resetState);

  it('renders AdminStats (Total Branches card) for system admin', () => {
    authState.activeRole = 'admin';
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('Total Branches')).toBeInTheDocument();
  });

  it('renders BranchAdminStats (Branch Admin chip + branch members card) for branch admin', () => {
    authState.activeRole = 'leader';
    leadershipData = { ...emptyLeadership, branchSystemAdminBranchIds: ['b-1'] };
    render(<DashboardPage />, { wrapper });
    // Chip
    expect(screen.getByText('Branch Admin')).toBeInTheDocument();
    // PastorStats-style card
    expect(screen.getAllByText('Branch Members').length).toBeGreaterThan(0);
  });

  it('renders PastorStats (Branch Members card, no Branch Admin chip) for pastor', () => {
    authState.activeRole = 'pastor';
    render(<DashboardPage />, { wrapper });
    expect(screen.getAllByText('Branch Members').length).toBeGreaterThan(0);
    expect(screen.queryByText('Branch Admin')).not.toBeInTheDocument();
  });

  it('renders FellowshipStats for fellowship-only leader', () => {
    authState.activeRole = 'leader';
    leadershipData = {
      ...emptyLeadership,
      leadFellowships: [{ id: 'f-1', fellowshipName: 'Youth', branchId: 'b-1' }],
    };
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('My Fellowships')).toBeInTheDocument();
    expect(screen.getAllByText('Youth').length).toBeGreaterThan(0);
  });

  it('renders DepartmentStats for department-only leader', () => {
    authState.activeRole = 'leader';
    leadershipData = {
      ...emptyLeadership,
      leadDepartments: [{ id: 'd-1', departmentName: 'Worship', branchId: 'b-1' }],
    };
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('My Departments')).toBeInTheDocument();
    expect(screen.getAllByText('Worship').length).toBeGreaterThan(0);
  });

  it('renders DualLeaderTabs with both panels reachable when caller is dual lead', () => {
    authState.activeRole = 'leader';
    leadershipData = {
      ...emptyLeadership,
      leadFellowships: [{ id: 'f-1', fellowshipName: 'Youth', branchId: 'b-1' }],
      leadDepartments: [{ id: 'd-1', departmentName: 'Worship', branchId: 'b-1' }],
    };
    render(<DashboardPage />, { wrapper });
    // Tab bar present (Tabs primitive renders role="tab" per ARIA APG).
    const fellowshipTab = screen.getByRole('tab', { name: 'My Fellowship' });
    const departmentTab = screen.getByRole('tab', { name: 'My Department' });
    expect(fellowshipTab).toBeInTheDocument();
    expect(departmentTab).toBeInTheDocument();
    // Default tab — Fellowship panel
    expect(screen.getByText('My Fellowships')).toBeInTheDocument();
    // Switch to Department panel
    fireEvent.click(departmentTab);
    expect(screen.getByText('My Departments')).toBeInTheDocument();
  });

  it('renders MemberStats for plain member', () => {
    render(<DashboardPage />, { wrapper });
    expect(screen.getAllByText('My Fellowships').length).toBeGreaterThan(0);
    expect(screen.getByText('Attendance Rate')).toBeInTheDocument();
  });
});

describe('DashboardPage — PendingApprovalsPanel visibility', () => {
  beforeEach(resetState);

  // Note: AdminStats / PastorStats / BranchAdminStats each contain their own
  // "Pending Approvals" StatCard. The right-rail PendingApprovalsPanel ALSO
  // uses that heading. So the assertion here is "at least one extra
  // occurrence" — the panel — vs. the card alone for non-leadership roles.

  it('shows for system admin (panel + card)', () => {
    authState.activeRole = 'admin';
    render(<DashboardPage />, { wrapper });
    // AdminStats card + right-rail panel = 2 occurrences
    expect(screen.getAllByText('Pending Approvals').length).toBeGreaterThanOrEqual(2);
  });

  it('shows for branch admin (panel + card)', () => {
    authState.activeRole = 'leader';
    leadershipData = { ...emptyLeadership, branchDataAdminBranchIds: ['b-1'] };
    render(<DashboardPage />, { wrapper });
    expect(screen.getAllByText('Pending Approvals').length).toBeGreaterThanOrEqual(2);
  });

  it('shows for pastor (panel + card)', () => {
    authState.activeRole = 'pastor';
    render(<DashboardPage />, { wrapper });
    expect(screen.getAllByText('Pending Approvals').length).toBeGreaterThanOrEqual(2);
  });

  it('hides for a fellowship-only leader (no branch authority)', () => {
    authState.activeRole = 'leader';
    leadershipData = {
      ...emptyLeadership,
      leadFellowships: [{ id: 'f-1', fellowshipName: 'Youth', branchId: 'b-1' }],
    };
    render(<DashboardPage />, { wrapper });
    // Only the FellowshipStats card has no Pending Approvals title, so the
    // panel being hidden means zero matches.
    expect(screen.queryByText('Pending Approvals')).not.toBeInTheDocument();
  });

  it('hides for plain member', () => {
    render(<DashboardPage />, { wrapper });
    expect(screen.queryByText('Pending Approvals')).not.toBeInTheDocument();
  });
});

// ── Phase 4: scope-aware dashboard fork ──────────────────────────────
//
// /api/me/leadership now scope-filters its response server-side. The
// dashboard reads that filtered shape, so it doesn't need extra logic to
// pick the right fork. These tests stand in for the end-to-end:
//   - The mocked leadership data here represents what the API would return
//     for a scope-bound login (single fellowship / department / branch).
//   - The dashboard renders the expected single-tier fork.
//   - The role label honors the scope choice instead of falling back to
//     dual-role labels.

describe('DashboardPage — scope-aware fork', () => {
  beforeEach(resetState);

  it('fellowship-scoped login: renders FellowshipStats with ONLY the scoped fellowship, never DualLeaderTabs', () => {
    authState.activeRole = 'leader';
    authState.scope = { kind: 'fellowship', id: 'f-1' };
    // Server-side scope filtering empties the department arrays.
    leadershipData = {
      ...emptyLeadership,
      leadFellowships: [{ id: 'f-1', fellowshipName: 'K-Groups Central', branchId: 'b-1' }],
    };
    render(<DashboardPage />, { wrapper });

    // Single-fellowship view — FellowshipStats card visible.
    expect(screen.getByText('My Fellowships')).toBeInTheDocument();
    expect(screen.getAllByText('K-Groups Central').length).toBeGreaterThan(0);
    // No DualLeaderTabs.
    expect(screen.queryByRole('tab', { name: 'My Department' })).not.toBeInTheDocument();
    // Role label reflects the scope choice.
    expect(screen.getByText('Fellowship Leader — K-Groups Central')).toBeInTheDocument();
  });

  it('department-scoped login: renders DepartmentStats with ONLY the scoped department', () => {
    authState.activeRole = 'leader';
    authState.scope = { kind: 'department', id: 'd-1' };
    leadershipData = {
      ...emptyLeadership,
      leadDepartments: [{ id: 'd-1', departmentName: 'Worship', branchId: 'b-1' }],
    };
    render(<DashboardPage />, { wrapper });

    expect(screen.getByText('My Departments')).toBeInTheDocument();
    expect(screen.getAllByText('Worship').length).toBeGreaterThan(0);
    expect(screen.queryByRole('tab', { name: 'My Fellowship' })).not.toBeInTheDocument();
    expect(screen.getByText('Department Lead — Worship')).toBeInTheDocument();
  });

  it('branch-scoped BSA login (activeRole=admin): renders BSA chip + branch-suffixed role label', () => {
    // Per the picker contract in @kairos/types api.ts:
    //   Branch System Admin → activeRole='admin', scope={branch:<branchId>}
    authState.activeRole = 'admin';
    authState.scope = { kind: 'branch', id: 'b-2' };
    // The user holds BSA on the scoped branch (b-2). homeBranchId is b-1 —
    // the role label should still suffix b-2 (Accra), not London.
    leadershipData = { ...emptyLeadership, branchSystemAdminBranchIds: ['b-2'] };
    render(<DashboardPage />, { wrapper });

    // BranchAdminStats wins over AdminStats because isBranchAdmin is true.
    expect(screen.getByText('Branch Admin')).toBeInTheDocument();
    expect(screen.getAllByText('Branch Members').length).toBeGreaterThan(0);
    expect(screen.getByText('Branch System Admin — Accra')).toBeInTheDocument();
  });

  it('branch-scoped pastor login: renders Pastor — {scoped branch} label', () => {
    // A pastor who picks "Pastor — Accra" at /select-role hits this path,
    // even though homeBranchId is b-1.
    authState.activeRole = 'pastor';
    authState.scope = { kind: 'branch', id: 'b-2' };
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('Pastor — Accra')).toBeInTheDocument();
  });
});

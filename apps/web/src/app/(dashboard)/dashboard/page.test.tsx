import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { MeHomeResponse } from '@kairos/types';

// The page holds no role logic — `altitude` in the payload decides what
// renders. These tests drive the payload and assert the arrangement, which is
// what the old seven-way persona cascade used to decide in the component.

let authState = {
  user: { firstName: 'Grace', homeBranchId: 'b-1' } as Record<string, unknown> | null,
  activeRole: 'member' as string | null,
  scope: null as { kind: string; id: string } | null,
  setScope: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: <T,>(selector?: (s: typeof authState) => T) =>
    selector ? selector(authState) : (authState as unknown as T),
}));

vi.mock('@/hooks/use-capabilities', () => ({
  useCapabilities: () => ({ has: () => false }),
}));

let homeState: {
  data: MeHomeResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
} = { data: undefined, isLoading: false, isError: false };

const refetch = vi.fn();

vi.mock('@/hooks/use-me', () => ({
  useMeHome: () => ({ ...homeState, refetch }),
  useMyLeadership: () => ({ data: undefined }),
}));

vi.mock('@/hooks/use-branches', () => ({
  useBranches: () => ({ data: [] }),
}));

vi.mock('@/hooks/use-members', () => ({
  useMembers: () => ({ data: { data: [] } }),
}));

vi.mock('@/hooks/use-fellowships', () => ({
  useFellowships: () => ({ data: { data: [] } }),
}));

import DashboardPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function home(overrides: Partial<MeHomeResponse> = {}): MeHomeResponse {
  return {
    altitude: 'personal',
    today: [],
    thisWeek: [],
    needsYou: [],
    pulse: null,
    groups: [],
    gettingStarted: [],
    streakWeeks: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  authState = {
    user: { firstName: 'Grace', homeBranchId: 'b-1' },
    activeRole: 'member',
    scope: null,
    setScope: vi.fn(),
  };
  homeState = { data: home(), isLoading: false, isError: false };
});

describe('DashboardPage — states', () => {
  it('shows a skeleton while the single home request is in flight', () => {
    homeState = { data: undefined, isLoading: true, isError: false };
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('Good day, Grace!')).toBeInTheDocument();
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('surfaces the API message and a retry on failure', () => {
    homeState = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Upstream unavailable'),
    };
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('Upstream unavailable')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Retry' }).click();
    expect(refetch).toHaveBeenCalled();
  });
});

describe('DashboardPage — altitude decides the arrangement', () => {
  it('a plain member gets no pulse', () => {
    render(<DashboardPage />, { wrapper });
    expect(screen.queryByText('Branch pulse')).not.toBeInTheDocument();
    expect(screen.queryByText('Church pulse')).not.toBeInTheDocument();
  });

  it('a plain member gets the getting-started prompts and their streak', () => {
    homeState = {
      data: home({
        streakWeeks: 7,
        gettingStarted: [{ key: 'join_fellowship', title: 'Join a fellowship' }],
      }),
      isLoading: false,
      isError: false,
    };
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('Join a fellowship')).toBeInTheDocument();
    expect(screen.getByText('7 weeks running')).toBeInTheDocument();
  });

  it('branch altitude renders the branch pulse with its metrics', () => {
    homeState = {
      data: home({
        altitude: 'branch',
        pulse: {
          scope: 'branch',
          scopeLabel: 'This branch',
          metrics: [
            { key: 'congregation', label: 'Total congregation', value: 1204, delta: null },
            { key: 'attendance_rate', label: 'Attendance last week', value: 71, delta: '−4% vs 4wk' },
          ],
          warnings: [],
        },
      }),
      isLoading: false,
      isError: false,
    };
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('Branch pulse')).toBeInTheDocument();
    expect(screen.getByText('1,204')).toBeInTheDocument();
    expect(screen.getByText('−4% vs 4wk')).toBeInTheDocument();
  });

  it('church altitude labels the tail block Branches', () => {
    homeState = {
      data: home({
        altitude: 'church',
        pulse: {
          scope: 'church',
          scopeLabel: 'Church-wide',
          metrics: [{ key: 'branches', label: 'Branches', value: 12, delta: null }],
          warnings: [],
        },
        groups: [
          { kind: 'branch', id: 'b-1', name: 'London', headcount: 412, lastPresent: 412, lastTotal: null },
        ],
      }),
      isLoading: false,
      isError: false,
    };
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('Church pulse')).toBeInTheDocument();
    expect(screen.getByText('All branches')).toBeInTheDocument();
    expect(screen.getByText('London')).toBeInTheDocument();
  });

  it('group altitude labels the tail block My groups and still has no pulse', () => {
    homeState = {
      data: home({
        altitude: 'group',
        groups: [
          {
            kind: 'fellowship',
            id: 'f-1',
            name: 'Grace Fellowship',
            headcount: 24,
            lastPresent: 18,
            lastTotal: 24,
          },
        ],
      }),
      isLoading: false,
      isError: false,
    };
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('My groups')).toBeInTheDocument();
    expect(screen.getByText('24 members · last 18/24')).toBeInTheDocument();
    expect(screen.queryByText('Branch pulse')).not.toBeInTheDocument();
  });
});

describe('DashboardPage — needs you', () => {
  it('renders a counted task row and links it to the web route', () => {
    homeState = {
      data: home({
        altitude: 'branch',
        needsYou: [
          {
            kind: 'member_approval',
            id: 'member_approval',
            title: '3 member approvals',
            subtitle: null,
            count: 3,
            urgency: 'normal',
            refs: {},
          },
        ],
      }),
      isLoading: false,
      isError: false,
    };
    render(<DashboardPage />, { wrapper });
    const link = screen.getByRole('link', { name: /3 member approvals/ });
    expect(link).toHaveAttribute('href', '/members/approval');
  });

  it('routes a missing register to the fellowship page — web has no register route', () => {
    homeState = {
      data: home({
        altitude: 'group',
        needsYou: [
          {
            kind: 'register_missing',
            id: 'mtg-1',
            title: 'Register not taken',
            subtitle: 'Grace Fellowship · Thu 2 Oct',
            count: 1,
            urgency: 'high',
            refs: { fellowshipId: 'f-1', meetingId: 'mtg-1' },
          },
        ],
      }),
      isLoading: false,
      isError: false,
    };
    render(<DashboardPage />, { wrapper });
    const link = screen.getByRole('link', { name: /Register not taken/ });
    expect(link).toHaveAttribute('href', '/fellowships/f-1');
  });

  it('is absent entirely when nothing is waiting', () => {
    render(<DashboardPage />, { wrapper });
    expect(screen.queryByText('Needs you')).not.toBeInTheDocument();
  });
});

describe('DashboardPage — agenda', () => {
  it('shows today and this week separately', () => {
    homeState = {
      data: home({
        today: [
          {
            kind: 'service',
            id: 's-1',
            title: 'Sunday Service',
            subtitle: 'Kharis London',
            at: '2026-10-04T10:00:00.000Z',
            refs: { serviceId: 's-1' },
          },
        ],
        thisWeek: [
          {
            kind: 'fellowship_meeting',
            id: 'm-1',
            title: 'Grace Fellowship',
            subtitle: null,
            at: '2026-10-08T19:00:00.000Z',
            refs: { fellowshipId: 'f-1', meetingId: 'm-1' },
          },
        ],
      }),
      isLoading: false,
      isError: false,
    };
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('This week')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sunday Service/ })).toHaveAttribute(
      'href',
      '/attendance/s-1',
    );
  });
});

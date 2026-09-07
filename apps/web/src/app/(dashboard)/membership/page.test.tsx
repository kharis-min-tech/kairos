import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MembershipPage from './page';

// ── Mocks ─────────────────────────────────────────────────

// The admin gate is `membership:admin` at CHURCH scope, NOT
// `systemRole === 'admin'`. Driving the mock through `has` rather than the
// role is the point: a Membership Admin holds no platform authority.
let hasMembershipAdmin = false;
vi.mock('@/hooks/use-capabilities', () => ({
  useCapabilities: () => ({
    systemRole: 'member' as const,
    has: (cap: string) => cap === 'membership:admin' && hasMembershipAdmin,
  }),
}));

let cohorts: unknown[] = [];
let mine: unknown = {
  enrollment: null,
  readiness: null,
  interest: null,
  confirmedAt: null,
};
const expressMutate = vi.fn();
const withdrawMutate = vi.fn();

vi.mock('@/hooks/use-membership', () => ({
  useMembershipCohorts: () => ({ data: { cohorts }, isLoading: false }),
  useMyMembership: () => ({ data: mine }),
  useExpressInterest: () => ({ mutate: expressMutate, isPending: false }),
  useWithdrawInterest: () => ({ mutate: withdrawMutate, isPending: false }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const cohort = {
  id: 'c1',
  name: 'Autumn 2026',
  startDate: '2026-09-01',
  graduationDate: '2026-10-01',
  finalTestDeadline: null,
  status: 'active' as const,
  enrolmentOpen: true,
  homeworkPassMark: 50,
  quizPassMark: 50,
  finalTestPassMark: 50,
  isActive: true,
  createdAt: '',
  updatedAt: '',
  enrolledCount: 12,
  graduatedCount: 3,
  sessionCount: 4,
};

beforeEach(() => {
  vi.clearAllMocks();
  hasMembershipAdmin = false;
  cohorts = [cohort];
  mine = { enrollment: null, readiness: null, interest: null, confirmedAt: null };
});

describe('MembershipPage', () => {
  it('lists cohorts with their enrolment counts', () => {
    render(<MembershipPage />);
    expect(screen.getByText('Autumn 2026')).toBeInTheDocument();
    expect(screen.getByText(/12 enrolled/)).toBeInTheDocument();
  });

  it('shows the admin CTAs only to a membership admin', () => {
    render(<MembershipPage />);
    expect(screen.queryByText('New cohort')).not.toBeInTheDocument();
    expect(screen.queryByText('Interest pool')).not.toBeInTheDocument();

    hasMembershipAdmin = true;
    render(<MembershipPage />);
    expect(screen.getByText('New cohort')).toBeInTheDocument();
    expect(screen.getByText('Interest pool')).toBeInTheDocument();
  });

  it('never offers a per-cohort enrol button — enrolment is not self-service', () => {
    render(<MembershipPage />);
    expect(screen.queryByRole('button', { name: /enrol me/i })).not.toBeInTheDocument();
  });

  it('offers the interest list when the member has no enrolment and no entry', () => {
    render(<MembershipPage />);
    expect(screen.getByRole('button', { name: /join the list/i })).toBeInTheDocument();
  });

  it('shows the wait and an opt-out once the member is on the list', () => {
    mine = {
      enrollment: null,
      readiness: null,
      interest: {
        status: 'waiting',
        expressedAt: '2026-03-01',
        expiresAt: '2026-08-28',
      },
      confirmedAt: null,
    };
    render(<MembershipPage />);
    expect(screen.getByText(/on the list for the next class/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /take me off/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /join the list/i })).not.toBeInTheDocument();
  });

  it('says a place LAPSED rather than silently offering the list again', () => {
    // The whole point of the two-stage model: someone who drifted away for a
    // season must be told their place ended, not quietly shown a fresh button
    // as though nothing had happened.
    mine = {
      enrollment: null,
      readiness: null,
      interest: { status: 'lapsed', expressedAt: '2025-09-01', expiresAt: '2026-03-01' },
      confirmedAt: null,
    };
    render(<MembershipPage />);
    expect(screen.getByText(/place on the list has ended/i)).toBeInTheDocument();
    expect(screen.getByText(/lapsed on/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join again/i })).toBeInTheDocument();
  });

  it('hides the interest list once the member is enrolled in a cohort', () => {
    mine = {
      enrollment: { cohortName: 'Autumn 2026' },
      readiness: { eligible: false, outstanding: ['Final test not passed'] },
      interest: { status: 'admitted' },
      confirmedAt: null,
    };
    render(<MembershipPage />);
    expect(screen.queryByRole('button', { name: /join the list/i })).not.toBeInTheDocument();
  });

  it('surfaces the outstanding graduation requirements on the progress card', () => {
    mine = {
      enrollment: { cohortName: 'Autumn 2026' },
      readiness: {
        eligible: false,
        outstanding: ['Has not attended the induction ceremony'],
      },
      interest: null,
      confirmedAt: null,
    };
    render(<MembershipPage />);
    expect(
      screen.getByText(/Has not attended the induction ceremony/),
    ).toBeInTheDocument();
  });

  it('shows the confirmed-Member state instead of a cohort progress card', () => {
    mine = {
      enrollment: null,
      readiness: null,
      interest: null,
      confirmedAt: '2026-05-01',
    };
    render(<MembershipPage />);
    expect(screen.getByText(/You are a confirmed Member/)).toBeInTheDocument();
    // Already a Member, so nothing to join.
    expect(screen.queryByRole('button', { name: /join the list/i })).not.toBeInTheDocument();
  });

  it('renders an empty state when there are no cohorts', () => {
    cohorts = [];
    render(<MembershipPage />);
    expect(screen.getByText(/No cohorts yet/)).toBeInTheDocument();
  });
});

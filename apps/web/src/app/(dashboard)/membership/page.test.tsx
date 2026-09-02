import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MembershipPage from './page';

// ── Mocks ─────────────────────────────────────────────────

let systemRole: 'admin' | 'member' = 'member';
vi.mock('@/hooks/use-capabilities', () => ({
  useCapabilities: () => ({ systemRole, has: () => false }),
}));

let cohorts: unknown[] = [];
let mine: unknown = { enrollment: null, readiness: null, confirmedAt: null };
const enrolMutate = vi.fn();

vi.mock('@/hooks/use-membership', () => ({
  useMembershipCohorts: () => ({ data: { cohorts }, isLoading: false }),
  useMyMembership: () => ({ data: mine }),
  useEnrolSelf: () => ({ mutate: enrolMutate, isPending: false }),
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
  teacherCount: 2,
  sessionCount: 4,
};

beforeEach(() => {
  vi.clearAllMocks();
  systemRole = 'member';
  cohorts = [cohort];
  mine = { enrollment: null, readiness: null, confirmedAt: null };
});

describe('MembershipPage', () => {
  it('lists cohorts with their enrolment counts', () => {
    render(<MembershipPage />);
    expect(screen.getByText('Autumn 2026')).toBeInTheDocument();
    expect(screen.getByText(/12 enrolled/)).toBeInTheDocument();
  });

  it('shows the New cohort CTA to an admin only', () => {
    render(<MembershipPage />);
    expect(screen.queryByText('New cohort')).not.toBeInTheDocument();

    systemRole = 'admin';
    render(<MembershipPage />);
    expect(screen.getByText('New cohort')).toBeInTheDocument();
  });

  it('offers self-enrolment when the member has no enrolment', () => {
    render(<MembershipPage />);
    expect(screen.getByRole('button', { name: /enrol me/i })).toBeInTheDocument();
  });

  it('hides self-enrolment once the member is already enrolled', () => {
    mine = {
      enrollment: { cohortName: 'Autumn 2026' },
      readiness: { eligible: false, outstanding: ['Final test not passed'] },
      confirmedAt: null,
    };
    render(<MembershipPage />);
    expect(screen.queryByRole('button', { name: /enrol me/i })).not.toBeInTheDocument();
  });

  it('hides self-enrolment when the cohort is closed to enrolment', () => {
    cohorts = [{ ...cohort, enrolmentOpen: false }];
    render(<MembershipPage />);
    expect(screen.queryByRole('button', { name: /enrol me/i })).not.toBeInTheDocument();
  });

  it('surfaces the outstanding graduation requirements on the progress card', () => {
    mine = {
      enrollment: { cohortName: 'Autumn 2026' },
      readiness: {
        eligible: false,
        outstanding: ['Has not attended the induction ceremony'],
      },
      confirmedAt: null,
    };
    render(<MembershipPage />);
    expect(
      screen.getByText(/Has not attended the induction ceremony/),
    ).toBeInTheDocument();
  });

  it('shows the confirmed-Member state instead of a cohort progress card', () => {
    mine = { enrollment: null, readiness: null, confirmedAt: '2026-05-01' };
    render(<MembershipPage />);
    expect(screen.getByText(/You are a confirmed Member/)).toBeInTheDocument();
    // Already a Member, so no self-enrolment CTA.
    expect(screen.queryByRole('button', { name: /enrol me/i })).not.toBeInTheDocument();
  });

  it('renders an empty state when there are no cohorts', () => {
    cohorts = [];
    render(<MembershipPage />);
    expect(screen.getByText(/No cohorts yet/)).toBeInTheDocument();
  });
});

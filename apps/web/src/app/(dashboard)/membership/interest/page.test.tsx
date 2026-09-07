import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MembershipInterestPage from './page';

// ── Mocks ─────────────────────────────────────────────────

let hasMembershipAdmin = true;
vi.mock('@/hooks/use-capabilities', () => ({
  useCapabilities: () => ({
    systemRole: 'member' as const,
    has: (cap: string) => cap === 'membership:admin' && hasMembershipAdmin,
  }),
}));

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

let rows: unknown[] = [];
let cohorts: unknown[] = [];
const admitMutate = vi.fn();

vi.mock('@/hooks/use-membership', () => ({
  useMembershipInterest: () => ({
    data: { interest: rows, pagination: { page: 1, limit: 25, total: rows.length, totalPages: 1 } },
    isLoading: false,
  }),
  useMembershipCohorts: () => ({ data: { cohorts } }),
  useAdmitMembers: () => ({ mutate: admitMutate, isPending: false }),
}));

const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: (m: string) => toastError(m) } }));

function entry(over: Record<string, unknown> = {}) {
  return {
    id: 'i1',
    memberId: 'm1',
    branchId: 'b1',
    status: 'waiting' as const,
    expressedAt: '2026-03-01',
    expiresAt: '2026-08-28',
    admittedCohortId: null,
    admittedAt: null,
    admittedBy: null,
    notes: null,
    createdAt: '',
    updatedAt: '',
    memberFirstName: 'Ada',
    memberLastName: 'Bell',
    memberEmail: 'ada@example.com',
    memberPhone: null,
    branchName: 'London',
    waitingDays: 42,
    recentAttendanceCount: 5,
    ...over,
  };
}

const openCohort = { id: 'c1', name: 'Autumn 2026', status: 'active' as const };

beforeEach(() => {
  vi.clearAllMocks();
  hasMembershipAdmin = true;
  rows = [entry()];
  cohorts = [openCohort];
});

describe('MembershipInterestPage', () => {
  it('redirects anyone without membership:admin', () => {
    hasMembershipAdmin = false;
    render(<MembershipInterestPage />);
    expect(replace).toHaveBeenCalledWith('/membership');
  });

  it('shows how long each person has waited', () => {
    render(<MembershipInterestPage />);
    expect(screen.getByText('Ada Bell')).toBeInTheDocument();
    expect(screen.getByText(/Waiting 42 days/)).toBeInTheDocument();
  });

  it('flags somebody who has not been seen in 90 days', () => {
    // Admission is a judgement call, and this is the case the lapse rule
    // exists for. A bare "0" would make the admin infer it.
    rows = [entry({ recentAttendanceCount: 0 })];
    render(<MembershipInterestPage />);
    expect(screen.getByText(/Not seen in 90 days/)).toBeInTheDocument();
  });

  it('shows recent attendance when the person has been around', () => {
    render(<MembershipInterestPage />);
    expect(screen.getByText(/5 services in 90 days/)).toBeInTheDocument();
  });

  it('says when a waiting place will lapse', () => {
    render(<MembershipInterestPage />);
    expect(screen.getByText(/Lapses/)).toBeInTheDocument();
  });

  it('reveals the admit bar once somebody is selected', () => {
    render(<MembershipInterestPage />);
    expect(screen.queryByRole('button', { name: /^admit$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /select ada bell/i }));
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^admit$/i })).toBeInTheDocument();
  });

  it('admits the selected people into the chosen cohort', () => {
    render(<MembershipInterestPage />);
    fireEvent.click(screen.getByRole('checkbox', { name: /select ada bell/i }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'c1' } });
    fireEvent.click(screen.getByRole('button', { name: /^admit$/i }));

    expect(admitMutate).toHaveBeenCalledWith(
      { memberIds: ['m1'] },
      expect.anything(),
    );
  });

  it('warns when no cohort is open to admissions', () => {
    cohorts = [];
    render(<MembershipInterestPage />);
    expect(screen.getByText(/No cohort is open to admissions/)).toBeInTheDocument();
  });

  it('does not offer a completed cohort as an admission target', () => {
    // The API refuses these, so offering them would only produce a confusing
    // failure after the admin has already picked names.
    cohorts = [openCohort, { id: 'c2', name: 'Spring 2025', status: 'completed' as const }];
    render(<MembershipInterestPage />);
    fireEvent.click(screen.getByRole('checkbox', { name: /select ada bell/i }));
    expect(screen.getByRole('option', { name: 'Autumn 2026' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Spring 2025' })).not.toBeInTheDocument();
  });

  it('offers no checkboxes on a settled tab — only waiting entries are admissible', () => {
    render(<MembershipInterestPage />);
    fireEvent.click(screen.getByRole('button', { name: 'lapsed' }));
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('renders an empty state when nobody is waiting', () => {
    rows = [];
    render(<MembershipInterestPage />);
    expect(screen.getByText(/Nobody is waiting right now/)).toBeInTheDocument();
  });
});

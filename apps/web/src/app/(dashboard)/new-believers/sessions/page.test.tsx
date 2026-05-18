import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { NewBelieverSession } from '@kairos/types';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Auth store — admin so management actions render.
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: () => ({
    user: { id: 'me', homeBranchId: 'branch-1' },
    activeRole: 'admin',
  }),
}));

vi.mock('@/hooks/use-members', () => ({
  useMembers: () => ({
    data: {
      data: [
        { id: 'teacher-1', firstName: 'Sarah', lastName: 'Okoye' },
      ],
    },
  }),
}));

const upcomingSession: NewBelieverSession = {
  id: 'upcoming-1',
  branchId: 'branch-1',
  sessionStage: 'session-1',
  sessionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  topic: 'Foundations of Faith',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const pastSession: NewBelieverSession = {
  id: 'past-1',
  branchId: 'branch-1',
  sessionStage: 'session-2',
  sessionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  topic: 'Who is a Christian',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

let sessionsData: NewBelieverSession[] = [upcomingSession, pastSession];

vi.mock('@/hooks/use-new-believers', () => ({
  useSessions: () => ({ data: sessionsData, isLoading: false }),
  useSessionAttendance: () => ({ data: [], isLoading: false }),
  useEnrollments: () => ({ data: { data: [], pagination: {} }, isLoading: false }),
  useRecordSessionAttendance: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateSession: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateSession: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import SessionsPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('SessionsPage', () => {
  beforeEach(() => {
    sessionsData = [upcomingSession, pastSession];
  });

  it('renders the header summary line with session count and next class', () => {
    render(<SessionsPage />, { wrapper });

    expect(screen.getByRole('heading', { name: /New Believers Sessions/i })).toBeInTheDocument();
    expect(screen.getByText(/2 sessions/)).toBeInTheDocument();
    expect(screen.getByText(/Next:/)).toBeInTheDocument();
  });

  it('groups sessions into Upcoming and Past sections', () => {
    render(<SessionsPage />, { wrapper });

    expect(screen.getByText(/Upcoming \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Past \(1\)/i)).toBeInTheDocument();
  });

  it('defaults selection to the next-upcoming session and shows its detail pane', () => {
    render(<SessionsPage />, { wrapper });

    expect(
      screen.getByRole('heading', { name: /Foundations of Faith/i, level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Attendance', selected: true })).toBeInTheDocument();
  });

  it('updates the detail pane when a past session is clicked', async () => {
    const user = userEvent.setup();
    render(<SessionsPage />, { wrapper });

    // There are two list-item buttons for the past session (the heading "Past (1)" is
    // text, not a button). Click the past session's list entry.
    const pastListSection = screen.getByText('Past (1)').closest('section')!;
    const pastButton = within(pastListSection).getByRole('button');
    await user.click(pastButton);

    expect(
      screen.getByRole('heading', { name: /Who is a Christian/i, level: 2 }),
    ).toBeInTheDocument();
  });

  it('shows an empty state when there are no sessions', () => {
    sessionsData = [];
    render(<SessionsPage />, { wrapper });

    expect(screen.getByText(/No sessions scheduled yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Session/i })).toBeInTheDocument();
  });

  it('renders the "New Session" button for admins', () => {
    render(<SessionsPage />, { wrapper });
    expect(screen.getAllByRole('button', { name: /New Session/i }).length).toBeGreaterThan(0);
  });
});

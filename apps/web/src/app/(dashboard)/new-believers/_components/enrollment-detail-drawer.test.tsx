import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useAuthStore } from '@/lib/auth-store';

// Mock sonner toast — don't depend on rendering toast UI
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock the new-believers hooks — replace useEnrollment + useUpdateEnrollment
let enrollmentData: Record<string, unknown> | null = null;
let enrollmentLoading = false;
const updateMutateAsync = vi.fn();
let updateIsPending = false;

vi.mock('@/hooks/use-new-believers', () => ({
  useEnrollment: (id: string) => ({
    data: id ? enrollmentData : undefined,
    isLoading: enrollmentLoading,
  }),
  useUpdateEnrollment: () => ({
    mutateAsync: updateMutateAsync,
    isPending: updateIsPending,
  }),
}));

import { EnrollmentDetailDrawer } from './enrollment-detail-drawer';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const branchMembers = [
  { id: 'm-1', firstName: 'Ada', lastName: 'Lovelace' },
  { id: 'm-2', firstName: 'Grace', lastName: 'Hopper' },
  { id: 'm-3', firstName: 'Edsger', lastName: 'Dijkstra' },
];

function makeEnrollment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'enr-1',
    memberId: 'm-1',
    stage: 'session-1',
    memberFirstName: 'Ada',
    memberLastName: 'Lovelace',
    teacherId: null,
    teacherFirstName: null,
    teacherLastName: null,
    mentorId: null,
    mentorFirstName: null,
    mentorLastName: null,
    enrolledAt: new Date('2026-01-15').toISOString(),
    updatedAt: new Date('2026-05-13').toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  enrollmentData = makeEnrollment();
  enrollmentLoading = false;
  updateIsPending = false;
  updateMutateAsync.mockResolvedValue({});
  // Default to leader role for "can edit" tests
  useAuthStore.setState({ activeRole: 'leader' });
});

describe('EnrollmentDetailDrawer', () => {
  it('renders the member name, stage label, and enrolled date when open', () => {
    render(
      <EnrollmentDetailDrawer
        enrollmentId="enr-1"
        onClose={() => {}}
        branchMembers={branchMembers}
      />,
      { wrapper },
    );
    expect(
      screen.getByRole('heading', { name: 'Ada Lovelace' }),
    ).toBeInTheDocument();
    // The stage label appears in uppercase styling
    expect(screen.getByText('Session 1')).toBeInTheDocument();
    expect(screen.getByText(/Enrolled/)).toBeInTheDocument();
  });

  it('does not render the dialog content when enrollmentId is null', () => {
    render(
      <EnrollmentDetailDrawer
        enrollmentId={null}
        onClose={() => {}}
        branchMembers={branchMembers}
      />,
      { wrapper },
    );
    // Heading is the dialog title; if drawer is closed, no heading is rendered
    expect(
      screen.queryByRole('heading', { name: 'Ada Lovelace' }),
    ).not.toBeInTheDocument();
  });

  it('shows the loading state when isLoading is true', () => {
    enrollmentLoading = true;
    enrollmentData = null;
    render(
      <EnrollmentDetailDrawer
        enrollmentId="enr-1"
        onClose={() => {}}
        branchMembers={branchMembers}
      />,
      { wrapper },
    );
    expect(screen.getByText(/Loading enrollment/i)).toBeInTheDocument();
  });

  it('renders the "Open full page" link pointing to /new-believers/{id}', () => {
    render(
      <EnrollmentDetailDrawer
        enrollmentId="enr-1"
        onClose={() => {}}
        branchMembers={branchMembers}
      />,
      { wrapper },
    );
    const link = screen.getByRole('link', { name: /Open full page/i });
    expect(link).toHaveAttribute('href', '/new-believers/enr-1');
  });

  it('calls onClose when the "Open full page" link is clicked', () => {
    const onClose = vi.fn();
    render(
      <EnrollmentDetailDrawer
        enrollmentId="enr-1"
        onClose={onClose}
        branchMembers={branchMembers}
      />,
      { wrapper },
    );
    fireEvent.click(screen.getByRole('link', { name: /Open full page/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders teacher/mentor as read-only text (not CustomSelect) when role is "member"', () => {
    useAuthStore.setState({ activeRole: 'member' });
    enrollmentData = makeEnrollment({
      teacherId: 'm-2',
      teacherFirstName: 'Grace',
      teacherLastName: 'Hopper',
      mentorId: 'm-3',
      mentorFirstName: 'Edsger',
      mentorLastName: 'Dijkstra',
    });

    render(
      <EnrollmentDetailDrawer
        enrollmentId="enr-1"
        onClose={() => {}}
        branchMembers={branchMembers}
      />,
      { wrapper },
    );

    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('Edsger Dijkstra')).toBeInTheDocument();
    // Read-only mode: the CustomSelect placeholders should not be rendered
    expect(screen.queryByText(/Assign teacher/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Assign mentor/i)).not.toBeInTheDocument();
  });

  it('renders "Not assigned" in read-only mode when no teacher/mentor is set', () => {
    useAuthStore.setState({ activeRole: 'member' });
    render(
      <EnrollmentDetailDrawer
        enrollmentId="enr-1"
        onClose={() => {}}
        branchMembers={branchMembers}
      />,
      { wrapper },
    );
    // Two "Not assigned" spots — one for teacher, one for mentor
    expect(screen.getAllByText('Not assigned')).toHaveLength(2);
  });

  it('renders the CustomSelect pickers in edit mode for a leader', () => {
    render(
      <EnrollmentDetailDrawer
        enrollmentId="enr-1"
        onClose={() => {}}
        branchMembers={branchMembers}
      />,
      { wrapper },
    );
    expect(screen.getByText(/Assign teacher/i)).toBeInTheDocument();
    expect(screen.getByText(/Assign mentor/i)).toBeInTheDocument();
  });

  it('fires the reassign mutation when the teacher CustomSelect changes (edit mode)', async () => {
    const user = userEvent.setup();
    render(
      <EnrollmentDetailDrawer
        enrollmentId="enr-1"
        onClose={() => {}}
        branchMembers={branchMembers}
      />,
      { wrapper },
    );

    // Open the teacher select and click Grace
    await user.click(screen.getByText(/Assign teacher/i));
    await user.click(screen.getByRole('button', { name: 'Grace Hopper' }));

    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledTimes(1);
    });
    expect(updateMutateAsync).toHaveBeenCalledWith({
      id: 'enr-1',
      data: { teacherId: 'm-2' },
    });
  });

  it('shows the "Advance to next stage" button for leader and calls the advance mutation', async () => {
    const user = userEvent.setup();
    render(
      <EnrollmentDetailDrawer
        enrollmentId="enr-1"
        onClose={() => {}}
        branchMembers={branchMembers}
      />,
      { wrapper },
    );

    // Current stage is session-1 → next is session-2
    const advanceBtn = screen.getByRole('button', { name: /Advance to Session 2/i });
    expect(advanceBtn).toBeInTheDocument();

    await user.click(advanceBtn);
    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: 'enr-1',
        data: { stage: 'session-2' },
      });
    });
  });

  it('hides the "Advance" button for non-leader roles', () => {
    useAuthStore.setState({ activeRole: 'member' });
    render(
      <EnrollmentDetailDrawer
        enrollmentId="enr-1"
        onClose={() => {}}
        branchMembers={branchMembers}
      />,
      { wrapper },
    );
    expect(
      screen.queryByRole('button', { name: /Advance to/i }),
    ).not.toBeInTheDocument();
  });

  it('hides the "Advance" button when the enrollment is already in the terminal "integrated" stage', () => {
    enrollmentData = makeEnrollment({ stage: 'integrated' });
    render(
      <EnrollmentDetailDrawer
        enrollmentId="enr-1"
        onClose={() => {}}
        branchMembers={branchMembers}
      />,
      { wrapper },
    );
    expect(
      screen.queryByRole('button', { name: /Advance to/i }),
    ).not.toBeInTheDocument();
  });

  it('disables the "Advance" button while a mutation is pending', () => {
    updateIsPending = true;
    render(
      <EnrollmentDetailDrawer
        enrollmentId="enr-1"
        onClose={() => {}}
        branchMembers={branchMembers}
      />,
      { wrapper },
    );
    const btn = screen.getByRole('button', { name: /Advance to Session 2/i });
    expect(btn).toBeDisabled();
  });
});

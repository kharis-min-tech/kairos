import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';

// Mock toast so we don't depend on sonner DOM
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock the useCreateEnrollment hook
const mutateAsync = vi.fn();
let isPending = false;
vi.mock('@/hooks/use-new-believers', () => ({
  useCreateEnrollment: () => ({
    mutateAsync,
    isPending,
  }),
}));

import { EnrollDialog } from './enroll-dialog';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const members = [
  { id: 'm-1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' },
  { id: 'm-2', firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com' },
  { id: 'm-3', firstName: 'Edsger', lastName: 'Dijkstra', email: null },
];

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  branchId: 'b-1',
  memberPool: members,
  teacherPool: members,
  mentorPool: members,
  allBranchMembers: members,
};

beforeEach(() => {
  vi.clearAllMocks();
  isPending = false;
  mutateAsync.mockResolvedValue({ id: 'enr-new' });
});

describe('EnrollDialog', () => {
  it('renders the dialog title and all three picker fields', () => {
    render(<EnrollDialog {...baseProps} />, { wrapper });
    expect(
      screen.getByRole('heading', { name: /Enrol Member in New Believers/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Member')).toBeInTheDocument();
    expect(screen.getByText('Assign Teacher')).toBeInTheDocument();
    expect(screen.getByText('Assign Mentor')).toBeInTheDocument();
  });

  it('disables submit while no member is selected', () => {
    render(<EnrollDialog {...baseProps} />, { wrapper });
    expect(screen.getByRole('button', { name: /^Enrol$/ })).toBeDisabled();
  });

  it('clears the teacher when the same person becomes the student', async () => {
    const user = userEvent.setup();
    render(<EnrollDialog {...baseProps} />, { wrapper });

    // Pick Ada as teacher first
    await user.click(screen.getByText(/Select a teacher/i));
    await user.click(screen.getByRole('button', { name: 'Ada Lovelace' }));
    // The teacher select now shows Ada
    expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(0);

    // Now pick Ada as the member — should auto-clear the teacher field
    await user.click(screen.getByText(/Select a member/i));
    await user.click(screen.getByRole('button', { name: 'Ada Lovelace' }));

    await waitFor(() => {
      // The teacher placeholder is back
      expect(screen.getByText(/Select a teacher/i)).toBeInTheDocument();
    });
  });

  it('clears the mentor when the same person becomes the student', async () => {
    const user = userEvent.setup();
    render(<EnrollDialog {...baseProps} />, { wrapper });

    await user.click(screen.getByText(/Select a mentor/i));
    await user.click(screen.getByRole('button', { name: 'Grace Hopper' }));

    await user.click(screen.getByText(/Select a member/i));
    await user.click(screen.getByRole('button', { name: 'Grace Hopper' }));

    await waitFor(() => {
      expect(screen.getByText(/Select a mentor/i)).toBeInTheDocument();
    });
  });

  it('shows the no-email warning when the selected mentor has no email on file', async () => {
    const user = userEvent.setup();
    render(<EnrollDialog {...baseProps} />, { wrapper });

    await user.click(screen.getByText(/Select a mentor/i));
    // Edsger Dijkstra has email: null
    await user.click(screen.getByRole('button', { name: 'Edsger Dijkstra' }));

    expect(
      screen.getByText(/no email on file/i),
    ).toBeInTheDocument();
  });

  it('does NOT show the no-email warning when the mentor has an email', async () => {
    const user = userEvent.setup();
    render(<EnrollDialog {...baseProps} />, { wrapper });

    await user.click(screen.getByText(/Select a mentor/i));
    await user.click(screen.getByRole('button', { name: 'Ada Lovelace' }));

    expect(
      screen.queryByText(/no email on file/i),
    ).not.toBeInTheDocument();
  });

  it('calls the create-enrollment mutation with the form values on submit', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <EnrollDialog {...baseProps} onOpenChange={onOpenChange} />,
      { wrapper },
    );

    // Pick a member to enable submit
    await user.click(screen.getByText(/Select a member/i));
    await user.click(screen.getByRole('button', { name: 'Ada Lovelace' }));

    // Pick a teacher (Grace)
    await user.click(screen.getByText(/Select a teacher/i));
    await user.click(screen.getByRole('button', { name: 'Grace Hopper' }));

    await user.click(screen.getByRole('button', { name: /^Enrol$/ }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(1);
    });
    expect(mutateAsync).toHaveBeenCalledWith({
      memberId: 'm-1',
      branchId: 'b-1',
      teacherId: 'm-2',
      mentorId: undefined,
      notes: undefined,
    });
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('shows the "Enrolling..." label and disables submit while pending', () => {
    isPending = true;
    render(<EnrollDialog {...baseProps} />, { wrapper });
    const submit = screen.getByRole('button', { name: /Enrolling/i });
    expect(submit).toBeDisabled();
  });

  it('closes the dialog when Cancel is clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <EnrollDialog {...baseProps} onOpenChange={onOpenChange} />,
      { wrapper },
    );
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('hides the chosen member from the teacher dropdown', async () => {
    const user = userEvent.setup();
    render(<EnrollDialog {...baseProps} />, { wrapper });

    // Pick Ada as the student
    await user.click(screen.getByText(/Select a member/i));
    await user.click(screen.getByRole('button', { name: 'Ada Lovelace' }));

    // Open teacher dropdown — Ada must NOT appear, but Grace and Edsger must
    await user.click(screen.getByText(/Select a teacher/i));
    const teacherOptions = screen.getAllByRole('button');
    const teacherNames = teacherOptions.map((b) => b.textContent ?? '');
    expect(teacherNames.some((n) => n.includes('Grace Hopper'))).toBe(true);
    expect(teacherNames.some((n) => n.includes('Edsger Dijkstra'))).toBe(true);
    expect(teacherNames.filter((n) => n.includes('Ada Lovelace')).length).toBe(1);
    // ↑ exactly one "Ada Lovelace" element: the currently-selected member chip
    //   in the member CustomSelect. None in the teacher option list.
  });

  it('hides the chosen member from the mentor dropdown', async () => {
    const user = userEvent.setup();
    render(<EnrollDialog {...baseProps} />, { wrapper });

    await user.click(screen.getByText(/Select a member/i));
    await user.click(screen.getByRole('button', { name: 'Grace Hopper' }));

    await user.click(screen.getByText(/Select a mentor/i));
    const mentorNames = screen.getAllByRole('button').map((b) => b.textContent ?? '');
    expect(mentorNames.some((n) => n.includes('Ada Lovelace'))).toBe(true);
    expect(mentorNames.some((n) => n.includes('Edsger Dijkstra'))).toBe(true);
    // Only one "Grace Hopper" — the selected-member chip; not in mentor options.
    expect(mentorNames.filter((n) => n.includes('Grace Hopper')).length).toBe(1);
  });

  it('hides the chosen teacher from the mentor dropdown (and vice versa)', async () => {
    const user = userEvent.setup();
    render(<EnrollDialog {...baseProps} />, { wrapper });

    // Pick a student so the dropdowns work normally
    await user.click(screen.getByText(/Select a member/i));
    await user.click(screen.getByRole('button', { name: 'Ada Lovelace' }));

    // Pick Grace as teacher
    await user.click(screen.getByText(/Select a teacher/i));
    await user.click(screen.getByRole('button', { name: 'Grace Hopper' }));

    // Mentor dropdown should hide Grace (already teacher) and Ada (the student)
    await user.click(screen.getByText(/Select a mentor/i));
    const mentorNames = screen.getAllByRole('button').map((b) => b.textContent ?? '');
    expect(mentorNames.some((n) => n.includes('Edsger Dijkstra'))).toBe(true);
    expect(mentorNames.filter((n) => n.includes('Grace Hopper')).length).toBe(1);
    expect(mentorNames.filter((n) => n.includes('Ada Lovelace')).length).toBe(1);
  });
});

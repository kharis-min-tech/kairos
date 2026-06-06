import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const recordMutate = vi.fn();
let rosterData: {
  data: Array<{ memberId: string; firstName: string; lastName: string; photoUrl: string | null; status: string | null }>;
} | undefined = { data: [] };

vi.mock('@/hooks/use-attendance', () => ({
  useServiceRoster: () => ({ data: rosterData, isLoading: false, isError: false, error: null }),
  useRecordAttendance: () => ({ mutateAsync: recordMutate, isPending: false }),
}));

// Avoid the real debounce timer so search-driven re-render is synchronous in tests.
vi.mock('@/hooks/use-debounced', () => ({ useDebounced: <T,>(v: T) => v }));

import { CheckInPanel } from './check-in-panel';

beforeEach(() => {
  vi.clearAllMocks();
  recordMutate.mockResolvedValue({ recorded: 1 });
  rosterData = {
    data: [
      { memberId: 'm1', firstName: 'Ada', lastName: 'Lovelace', photoUrl: null, status: null },
      { memberId: 'm2', firstName: 'Alan', lastName: 'Turing', photoUrl: null, status: null },
    ],
  };
});

describe('CheckInPanel', () => {
  it('renders roster rows', () => {
    render(<CheckInPanel serviceId="svc-1" />);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Alan Turing')).toBeInTheDocument();
  });

  it('marking a member Present and saving sends an existing-member entry', async () => {
    const user = userEvent.setup();
    render(<CheckInPanel serviceId="svc-1" />);

    await user.click(screen.getByRole('button', { name: 'Mark Ada Lovelace Present' }));
    await user.click(screen.getByRole('button', { name: /Save attendance/ }));

    await waitFor(() => expect(recordMutate).toHaveBeenCalledTimes(1));
    expect(recordMutate).toHaveBeenCalledWith({
      entries: [{ memberId: 'm1', status: 'Present' }],
    });
  });

  it('present-only: an unmarked member is not in the submitted entries', async () => {
    const user = userEvent.setup();
    render(<CheckInPanel serviceId="svc-1" />);

    await user.click(screen.getByRole('button', { name: 'Mark Ada Lovelace Present' }));
    await user.click(screen.getByRole('button', { name: /Save attendance/ }));

    await waitFor(() => expect(recordMutate).toHaveBeenCalledTimes(1));
    const entries = recordMutate.mock.calls[0]![0].entries;
    expect(entries).toHaveLength(1);
    expect(entries.some((e: { memberId?: string }) => e.memberId === 'm2')).toBe(false);
  });

  it('adding a first-time visitor sends a visitor entry', async () => {
    const user = userEvent.setup();
    render(<CheckInPanel serviceId="svc-1" />);

    await user.click(screen.getByRole('button', { name: /Add first-time visitor/ }));
    await user.type(screen.getByLabelText('First name'), 'Grace');
    await user.type(screen.getByLabelText('Last name'), 'Hopper');
    await user.type(screen.getByLabelText(/Phone/), '07123');
    await user.click(screen.getByRole('button', { name: /^Add visitor$/ }));

    await user.click(screen.getByRole('button', { name: /Save attendance/ }));

    await waitFor(() => expect(recordMutate).toHaveBeenCalledTimes(1));
    expect(recordMutate).toHaveBeenCalledWith({
      entries: [
        { visitor: { firstName: 'Grace', lastName: 'Hopper', phone: '07123' }, status: 'Present' },
      ],
    });
  });

  it('pre-populates marks from the roster existing status', async () => {
    rosterData = {
      data: [{ memberId: 'm1', firstName: 'Ada', lastName: 'Lovelace', photoUrl: null, status: 'Present' }],
    };
    const user = userEvent.setup();
    render(<CheckInPanel serviceId="svc-1" />);

    // Already counts as marked, so save sends it without any clicks.
    await user.click(screen.getByRole('button', { name: /Save attendance/ }));
    await waitFor(() => expect(recordMutate).toHaveBeenCalledTimes(1));
    expect(recordMutate.mock.calls[0]![0].entries).toEqual([{ memberId: 'm1', status: 'Present' }]);
  });
});

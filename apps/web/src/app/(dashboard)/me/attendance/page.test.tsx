import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let snapshot: unknown = {
  windowWeeks: 12,
  servicesInWindow: 10,
  attendedCount: 9,
  rate: 0.9,
  presentOnTimeCount: 7,
  lateCount: 1,
  virtualCount: 1,
  missedCount: 1,
  currentStreak: { kind: 'attended', length: 3 },
  lastAttendedAt: '2026-06-01T10:00:00.000Z',
  lastService: { id: 'svc-1', serviceDate: '2026-06-01T10:00:00.000Z', serviceType: 'Sunday', serviceTitle: null },
  history: [
    { serviceId: 's1', serviceDate: '2026-05-25T10:00:00.000Z', serviceType: 'Sunday', status: 'Present' },
    { serviceId: 's2', serviceDate: '2026-06-01T10:00:00.000Z', serviceType: 'Sunday', status: 'Late' },
  ],
};
let isLoading = false;
let isError = false;

vi.mock('@/hooks/use-attendance', () => ({
  useMyAttendance: () => ({ data: snapshot, isLoading, isError, error: null }),
}));

import MyAttendancePage from './page';

describe('MyAttendancePage', () => {
  it('shows the encouraging tone when rate is ≥ 80%', () => {
    snapshot = {
      ...(snapshot as object),
      rate: 0.9,
      servicesInWindow: 10,
      attendedCount: 9,
      missedCount: 1,
    };
    render(<MyAttendancePage />);
    expect(screen.getByText(/90%/i)).toBeDefined();
    expect(screen.getByText(/Great consistency/i)).toBeDefined();
  });

  it('shows the warning tone when rate is < 60%', () => {
    snapshot = {
      ...(snapshot as object),
      rate: 0.4,
      servicesInWindow: 10,
      attendedCount: 4,
      missedCount: 6,
    };
    render(<MyAttendancePage />);
    expect(screen.getByText(/40%/i)).toBeDefined();
    expect(screen.getByText(/6 missed/i)).toBeDefined();
  });

  it('renders the loading skeleton while fetching', () => {
    isLoading = true;
    render(<MyAttendancePage />);
    expect(screen.getByText(/Loading your attendance snapshot/i)).toBeDefined();
    isLoading = false;
  });

  it('renders the error state when the query fails', () => {
    isError = true;
    render(<MyAttendancePage />);
    expect(screen.getByRole('alert')).toBeDefined();
    isError = false;
  });
});

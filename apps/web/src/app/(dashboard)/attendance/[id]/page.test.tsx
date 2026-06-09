import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let authState: { activeRole: string | null } = { activeRole: 'admin' };

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'svc-1' }),
}));

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: <T,>(selector?: (s: typeof authState) => T) =>
    selector ? selector(authState) : (authState as unknown as T),
}));

vi.mock('@/hooks/use-attendance', () => ({
  useService: () => ({
    data: {
      id: 'svc-1',
      serviceType: 'Sunday',
      serviceTitle: 'Morning Service',
      serviceDate: '2026-06-07T10:00:00.000Z',
      preacherName: null,
      topic: null,
      recordedCount: 0,
    },
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

// CheckInPanel renders nothing useful in this test — stub it so we don't pull its dep tree.
vi.mock('../_components/check-in-panel', () => ({
  CheckInPanel: () => <div data-testid="check-in-panel">Check-in panel</div>,
}));

import CheckInPage from './page';

describe('CheckInPage — persona gating', () => {
  it('admin sees the CheckInPanel', () => {
    authState = { activeRole: 'admin' };
    render(<CheckInPage />);
    expect(screen.getByTestId('check-in-panel')).toBeDefined();
  });

  it('leader sees the CheckInPanel', () => {
    authState = { activeRole: 'leader' };
    render(<CheckInPage />);
    expect(screen.getByTestId('check-in-panel')).toBeDefined();
  });

  it('member sees a "leaders only" message instead of the CheckInPanel', () => {
    authState = { activeRole: 'member' };
    render(<CheckInPage />);
    expect(screen.getByText(/only available to leaders, pastors, and admins/i)).toBeDefined();
    expect(screen.queryByTestId('check-in-panel')).toBeNull();
  });
});

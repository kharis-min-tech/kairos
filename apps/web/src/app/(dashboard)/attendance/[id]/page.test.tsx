import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let canRecord = true;

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'svc-1' }),
}));

vi.mock('@/hooks/use-attendance', () => ({
  useService: () => ({
    data: {
      id: 'svc-1',
      branchId: 'b-1',
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
  useCanRecordAttendance: () => ({ data: { canRecord }, isLoading: false }),
}));

// CheckInPanel renders nothing useful in this test — stub it so we don't pull its dep tree.
vi.mock('../_components/check-in-panel', () => ({
  CheckInPanel: () => <div data-testid="check-in-panel">Check-in panel</div>,
}));

import CheckInPage from './page';

describe('CheckInPage — capability gating', () => {
  it('Admin-dept caller (canRecord=true) sees the CheckInPanel', () => {
    canRecord = true;
    render(<CheckInPage />);
    expect(screen.getByTestId('check-in-panel')).toBeDefined();
  });

  it('non-writer (canRecord=false) sees a "leaders only" message instead of the CheckInPanel', () => {
    canRecord = false;
    render(<CheckInPage />);
    expect(screen.getByText(/only available to leaders, pastors, and admins/i)).toBeDefined();
    expect(screen.queryByTestId('check-in-panel')).toBeNull();
  });
});

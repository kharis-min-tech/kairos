import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let canRecord = true;

vi.mock('@/hooks/use-attendance', () => ({
  useServices: () => ({ data: { data: [], total: 0, page: 1, limit: 50 }, isLoading: false, isError: false, error: null }),
  useCanRecordAttendance: () => ({ data: { canRecord }, isLoading: false }),
}));

import AttendanceServicesPage from './page';

describe('AttendanceServicesPage — CTA gating', () => {
  it('Admin-dept caller (canRecord=true) sees Reports + Record-a-service CTAs', () => {
    canRecord = true;
    render(<AttendanceServicesPage />);
    expect(screen.getByText(/Reports/i)).toBeDefined();
    // Header CTA + empty-state CTA — both should render for writers.
    expect(screen.getAllByText(/Record a service/i).length).toBeGreaterThan(0);
  });

  it('non-writer (canRecord=false) sees neither CTA and a member-tailored empty state', () => {
    canRecord = false;
    render(<AttendanceServicesPage />);
    expect(screen.queryByText(/Reports/i)).toBeNull();
    expect(screen.queryByText(/Record a service/i)).toBeNull();
    expect(screen.getByText(/no services to view in your branch/i)).toBeDefined();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let authState: { activeRole: string | null } = { activeRole: 'admin' };

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: <T,>(selector?: (s: typeof authState) => T) =>
    selector ? selector(authState) : (authState as unknown as T),
}));

vi.mock('@/hooks/use-attendance', () => ({
  useServices: () => ({ data: { data: [], total: 0, page: 1, limit: 50 }, isLoading: false, isError: false, error: null }),
}));

import AttendanceServicesPage from './page';

describe('AttendanceServicesPage — persona CTAs', () => {
  it('admin sees Reports + Record-a-service CTAs', () => {
    authState = { activeRole: 'admin' };
    render(<AttendanceServicesPage />);
    expect(screen.getByText(/Reports/i)).toBeDefined();
    // Header CTA + empty-state CTA — both should render for writers.
    expect(screen.getAllByText(/Record a service/i).length).toBeGreaterThan(0);
  });

  it('pastor sees Reports + Record-a-service CTAs', () => {
    authState = { activeRole: 'pastor' };
    render(<AttendanceServicesPage />);
    expect(screen.getByText(/Reports/i)).toBeDefined();
    expect(screen.getAllByText(/Record a service/i).length).toBeGreaterThan(0);
  });

  it('leader sees Reports + Record-a-service CTAs', () => {
    authState = { activeRole: 'leader' };
    render(<AttendanceServicesPage />);
    expect(screen.getByText(/Reports/i)).toBeDefined();
    expect(screen.getAllByText(/Record a service/i).length).toBeGreaterThan(0);
  });

  it('member sees neither CTA and a member-tailored empty state', () => {
    authState = { activeRole: 'member' };
    render(<AttendanceServicesPage />);
    expect(screen.queryByText(/Reports/i)).toBeNull();
    expect(screen.queryByText(/Record a service/i)).toBeNull();
    expect(screen.getByText(/no services to view in your branch/i)).toBeDefined();
  });
});

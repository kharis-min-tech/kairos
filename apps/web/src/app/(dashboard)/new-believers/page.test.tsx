import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

let authState: {
  user: { id: string; systemRole: string; homeBranchId?: string } | null;
  activeRole: string | null;
} = {
  user: { id: 'admin-1', systemRole: 'admin', homeBranchId: 'b-1' },
  activeRole: 'admin',
};

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: <T,>(selector?: (s: typeof authState) => T) =>
    selector ? selector(authState) : (authState as unknown as T),
}));

vi.mock('@/hooks/use-new-believers', () => ({
  useEnrollments: () => ({ data: { data: [], total: 0 }, isLoading: false }),
  useEnrollment: () => ({ data: undefined, isLoading: false }),
  useEnrollmentAlerts: () => ({ data: { data: [] } }),
  useCreateEnrollment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateEnrollment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useBulkAdvanceEnrollments: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/use-departments', () => ({
  useDepartments: () => ({ data: { data: [] } }),
}));

vi.mock('@/hooks/use-members', () => ({
  useMembers: () => ({ data: { data: [] } }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import NewBelieversPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('NewBelieversPage — persona surface', () => {
  it('admin sees the Enrol Member CTA and pipeline header', () => {
    authState = { user: { id: 'admin-1', systemRole: 'admin', homeBranchId: 'b-1' }, activeRole: 'admin' };
    render(<NewBelieversPage />, { wrapper });
    expect(screen.getByText(/Enrol Member/i)).toBeDefined();
    expect(screen.getByText(/Journey tracking from enrolment/i)).toBeDefined();
  });

  it('pastor sees the Enrol Member CTA', () => {
    authState = { user: { id: 'p-1', systemRole: 'pastor', homeBranchId: 'b-1' }, activeRole: 'pastor' };
    render(<NewBelieversPage />, { wrapper });
    expect(screen.getByText(/Enrol Member/i)).toBeDefined();
  });

  it('leader sees the pipeline but NOT the Enrol Member CTA', () => {
    authState = { user: { id: 'l-1', systemRole: 'member', homeBranchId: 'b-1' }, activeRole: 'leader' };
    render(<NewBelieversPage />, { wrapper });
    expect(screen.queryByText(/Enrol Member/i)).toBeNull();
    expect(screen.getByText(/Journey tracking from enrolment/i)).toBeDefined();
  });

  it('member sees the personal journey copy, NOT the Kanban pipeline header', () => {
    authState = { user: { id: 'm-1', systemRole: 'member', homeBranchId: 'b-1' }, activeRole: 'member' };
    render(<NewBelieversPage />, { wrapper });
    expect(screen.getByText(/Your journey through the New Believers programme/i)).toBeDefined();
    expect(screen.queryByText(/Journey tracking from enrolment/i)).toBeNull();
    expect(screen.queryByText(/Enrol Member/i)).toBeNull();
  });
});

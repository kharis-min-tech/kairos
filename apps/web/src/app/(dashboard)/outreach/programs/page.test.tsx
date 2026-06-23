import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  useAuthStore: <T,>(selector?: (s: typeof authState) => T) => (selector ? selector(authState) : (authState as unknown as T)),
}));

vi.mock('@/stores/outreach-store', () => ({
  useOutreachStore: () => ({
    programs: [],
    filters: {},
    pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    loading: false,
    error: null,
    fetchPrograms: vi.fn(),
    setFilters: vi.fn(),
    setPage: vi.fn(),
  }),
}));

vi.mock('@/hooks/useApi', () => ({
  useApi: () => ({}),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import OutreachProgramsPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {});

describe('OutreachProgramsPage — persona CTAs', () => {
  it('admin sees + Create Program', () => {
    authState = { user: { id: 'admin-1', systemRole: 'admin', homeBranchId: 'b-1' }, activeRole: 'admin' };
    render(<OutreachProgramsPage />, { wrapper });
    expect(screen.getByText(/Create Program/i)).toBeDefined();
  });

  it.skip('TODO Phase 5: pastor sees + Create Program', () => {
    authState = { user: { id: 'p-1', systemRole: 'pastor', homeBranchId: 'b-1' }, activeRole: 'pastor' };
    render(<OutreachProgramsPage />, { wrapper });
    expect(screen.getByText(/Create Program/i)).toBeDefined();
  });

  it.skip('TODO Phase 5: leader sees + Create Program', () => {
    authState = { user: { id: 'l-1', systemRole: 'member', homeBranchId: 'b-1' }, activeRole: 'leader' };
    render(<OutreachProgramsPage />, { wrapper });
    expect(screen.getByText(/Create Program/i)).toBeDefined();
  });

  it('member does NOT see + Create Program', () => {
    authState = { user: { id: 'm-1', systemRole: 'member', homeBranchId: 'b-1' }, activeRole: 'member' };
    render(<OutreachProgramsPage />, { wrapper });
    expect(screen.queryByText(/Create Program/i)).toBeNull();
  });
});

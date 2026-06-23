import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'fellowship-1' }),
  useRouter: () => ({ push: vi.fn(), replace }),
}));

let authState: {
  user: { id: string; systemRole: string; homeBranchId?: string } | null;
  activeRole: string | null;
} = {
  user: { id: 'admin-1', systemRole: 'admin' },
  activeRole: 'admin',
};

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: <T,>(selector?: (s: typeof authState) => T) => (selector ? selector(authState) : (authState as unknown as T)),
}));

const baseFellowship = {
  id: 'fellowship-1',
  fellowshipName: 'Brixton K-Group A',
  branchId: 'b-1',
  fellowshipType: 'K_GROUPS',
  description: '',
  leaderId: null,
  coLeaderId: null,
  meetingSchedule: 'Every week on Monday at 7:00 PM',
  isActive: true,
};

vi.mock('@/hooks/use-fellowships', () => ({
  useFellowship: () => ({ data: baseFellowship, isLoading: false }),
  useUpdateFellowship: () => ({ mutateAsync: vi.fn(), error: null }),
}));

vi.mock('@/hooks/use-branches', () => ({
  useBranches: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/use-members', () => ({
  useMembers: () => ({ data: { data: [] } }),
}));

import EditFellowshipPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  replace.mockClear();
});

describe('EditFellowshipPage — route guard', () => {
  it('admin sees the edit form', () => {
    authState = { user: { id: 'admin-1', systemRole: 'admin' }, activeRole: 'admin' };
    render(<EditFellowshipPage />, { wrapper });
    expect(screen.getByRole('heading', { name: 'Edit Fellowship' })).toBeDefined();
    expect(replace).not.toHaveBeenCalled();
  });

  it.skip('TODO Phase 5: pastor sees the edit form', () => {
    authState = { user: { id: 'p-1', systemRole: 'pastor', homeBranchId: 'b-1' }, activeRole: 'pastor' };
    render(<EditFellowshipPage />, { wrapper });
    expect(screen.getByRole('heading', { name: 'Edit Fellowship' })).toBeDefined();
    expect(replace).not.toHaveBeenCalled();
  });

  it.skip('TODO Phase 5: leader is redirected to /fellowships/[id]', async () => {
    authState = { user: { id: 'l-1', systemRole: 'member' }, activeRole: 'leader' };
    render(<EditFellowshipPage />, { wrapper });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/fellowships/fellowship-1'));
  });

  it('member is redirected to /fellowships/[id]', async () => {
    authState = { user: { id: 'm-1', systemRole: 'member' }, activeRole: 'member' };
    render(<EditFellowshipPage />, { wrapper });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/fellowships/fellowship-1'));
  });
});

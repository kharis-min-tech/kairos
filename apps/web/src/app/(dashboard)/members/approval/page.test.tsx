import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

let authState: { user: { id: string; systemRole: string } | null } = {
  user: { id: 'admin-1', systemRole: 'admin' },
};

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: <T,>(selector?: (s: typeof authState) => T) => (selector ? selector(authState) : (authState as unknown as T)),
}));

vi.mock('@/hooks/use-members', () => ({
  useMembers: () => ({ data: { data: [] }, isLoading: false, error: null }),
  useApproveMember: () => ({ mutate: vi.fn(), isPending: false }),
}));

import MemberApprovalPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  replace.mockClear();
});

describe('MemberApprovalPage — route guard', () => {
  it('admin sees the page', () => {
    authState = { user: { id: 'admin-1', systemRole: 'admin' } };
    render(<MemberApprovalPage />, { wrapper });
    expect(screen.getByText('Approval Queue')).toBeDefined();
    expect(replace).not.toHaveBeenCalled();
  });

  it('pastor is redirected to /members', async () => {
    authState = { user: { id: 'p-1', systemRole: 'pastor' } };
    render(<MemberApprovalPage />, { wrapper });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/members'));
  });

  it('member is redirected to /members', async () => {
    authState = { user: { id: 'm-1', systemRole: 'member' } };
    render(<MemberApprovalPage />, { wrapper });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/members'));
  });
});

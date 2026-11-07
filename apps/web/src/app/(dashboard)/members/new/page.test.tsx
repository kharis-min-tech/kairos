import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
}));

let authState: { user: { id: string; systemRole: string } | null; activeRole: string | null } = {
  user: { id: 'admin-1', systemRole: 'admin' },
  activeRole: 'admin',
};

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: <T,>(selector?: (s: typeof authState) => T) => (selector ? selector(authState) : (authState as unknown as T)),
}));

vi.mock('@/hooks/use-members', () => ({
  useCreateMember: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null, reset: vi.fn() }),
}));

vi.mock('@/hooks/use-branches', () => ({
  useBranches: () => ({ data: [] }),
}));

import AddMemberPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  replace.mockClear();
});

describe('AddMemberPage — persona', () => {
  it('offers an admin no way to set the system role on create', () => {
    // The API no longer accepts `systemRole` on POST /api/members — the route
    // is gated on `branch:write`, not on admin, so the field was a path to
    // minting a global admin. Leaving the selector in place would have let an
    // admin set it, get a 201, and believe the promotion took.
    authState = { user: { id: 'admin-1', systemRole: 'admin' }, activeRole: 'admin' };
    render(<AddMemberPage />, { wrapper });
    const field = screen.getByLabelText('System Role') as HTMLInputElement;
    expect(field.tagName).toBe('INPUT');
    expect(field.disabled).toBe(true);
    expect(field.value).toBe('Member');
    expect(screen.queryByText(/Promote new admins or pastors/i)).toBeNull();
    expect(screen.getByText(/Users & Roles/i)).toBeDefined();
  });
  it('member is redirected away', async () => {
    authState = { user: { id: 'm-1', systemRole: 'member' }, activeRole: 'member' };
    render(<AddMemberPage />, { wrapper });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
  });
});

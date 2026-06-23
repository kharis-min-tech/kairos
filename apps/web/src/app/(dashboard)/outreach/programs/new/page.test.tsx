import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
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

vi.mock('@/stores/outreach-store', () => ({
  useOutreachStore: () => ({ createProgram: vi.fn() }),
}));

vi.mock('@/hooks/useApi', () => ({
  useApi: () => ({
    branches: { list: vi.fn().mockResolvedValue({ success: true, data: [] }) },
    members: { list: vi.fn().mockResolvedValue({ success: true, data: { data: [] } }) },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/use-fellowships', () => ({
  useFellowships: () => ({ data: { data: [] } }),
}));

vi.mock('@/hooks/use-departments', () => ({
  useMyDepartments: () => ({ data: [] }),
}));

import CreateProgramPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  replace.mockClear();
});

describe('CreateProgramPage — route guard', () => {
  it('admin sees the form', () => {
    authState = { user: { id: 'admin-1', systemRole: 'admin' }, activeRole: 'admin' };
    render(<CreateProgramPage />, { wrapper });
    expect(screen.getByRole('heading', { name: /Create.*Program|New Program/i })).toBeDefined();
    expect(replace).not.toHaveBeenCalled();
  });
  it('member is redirected to /outreach/programs', async () => {
    authState = { user: { id: 'm-1', systemRole: 'member' }, activeRole: 'member' };
    render(<CreateProgramPage />, { wrapper });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/outreach/programs'));
  });
});

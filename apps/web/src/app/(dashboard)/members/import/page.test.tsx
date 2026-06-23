import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

let authState: {
  user: { id: string; systemRole: string } | null;
  activeRole: string | null;
} = {
  user: { id: 'admin-1', systemRole: 'admin' },
  activeRole: 'admin',
};

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: <T,>(selector?: (s: typeof authState) => T) => (selector ? selector(authState) : (authState as unknown as T)),
}));

vi.mock('@/lib/api', () => ({
  api: { members: { importCsv: vi.fn() } },
}));

import MembersImportPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

beforeEach(() => {
  replace.mockClear();
});

describe('MembersImportPage — route guard', () => {
  it('admin sees the page', () => {
    authState = { user: { id: 'admin-1', systemRole: 'admin' }, activeRole: 'admin' };
    render(<MembersImportPage />, { wrapper });
    expect(screen.getByRole('heading', { name: 'Import Members' })).toBeDefined();
    expect(replace).not.toHaveBeenCalled();
  });
  it('member is redirected to /members', async () => {
    authState = { user: { id: 'm-1', systemRole: 'member' }, activeRole: 'member' };
    render(<MembersImportPage />, { wrapper });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/members'));
  });
});

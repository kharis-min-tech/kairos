import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector?: (s: {
    user: { firstName: string };
    mustChangePassword: boolean;
    setMustChangePassword: () => void;
  }) => unknown) => {
    const state = {
      user: { firstName: 'Sam' },
      mustChangePassword: true,
      setMustChangePassword: () => undefined,
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/lib/api', () => ({
  api: { auth: { changePassword: vi.fn() } },
}));

import ChangePasswordPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('ChangePasswordPage a11y', () => {
  it('labels each password toggle for its field', async () => {
    render(<ChangePasswordPage />, { wrapper });
    expect(screen.getByRole('button', { name: 'Show temporary password' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Show new password' })).toBeDefined();

    await userEvent.click(screen.getByRole('button', { name: 'Show new password' }));
    expect(screen.getByRole('button', { name: 'Hide new password' })).toBeDefined();
    // temp toggle is unaffected
    expect(screen.getByRole('button', { name: 'Show temporary password' })).toBeDefined();
  });
});

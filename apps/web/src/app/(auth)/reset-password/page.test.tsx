import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams('token=valid-token'),
}));

vi.mock('@/hooks/use-auth', () => ({
  useResetPassword: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import ResetPasswordPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('ResetPasswordPage a11y', () => {
  it('labels both password visibility toggles distinctly', async () => {
    render(<ResetPasswordPage />, { wrapper });
    const newToggle = await screen.findByRole('button', { name: 'Show password' });
    const confirmToggle = screen.getByRole('button', { name: 'Show confirmation password' });
    expect(newToggle).not.toBe(confirmToggle);

    await userEvent.click(newToggle);
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeDefined();
    // confirm toggle still in "show" state
    expect(screen.getByRole('button', { name: 'Show confirmation password' })).toBeDefined();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/hooks/use-auth', () => ({
  useLogin: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import LoginPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('LoginPage a11y', () => {
  it('exposes role tabs with aria-selected', async () => {
    render(<LoginPage />, { wrapper });
    const memberTab = screen.getByRole('tab', { name: 'Member' });
    const leaderTab = screen.getByRole('tab', { name: 'Leader' });
    expect(memberTab).toHaveAttribute('aria-selected', 'true');
    expect(leaderTab).toHaveAttribute('aria-selected', 'false');

    await userEvent.click(leaderTab);
    expect(leaderTab).toHaveAttribute('aria-selected', 'true');
    expect(memberTab).toHaveAttribute('aria-selected', 'false');
  });

  it('toggles password visibility via labelled button', async () => {
    render(<LoginPage />, { wrapper });
    const toggle = screen.getByRole('button', { name: 'Show password' });
    await userEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeDefined();
  });

  it('disables OAuth buttons with "coming soon" labels', () => {
    render(<LoginPage />, { wrapper });
    const google = screen.getByRole('button', { name: /Google.*coming soon/i });
    const apple = screen.getByRole('button', { name: /Apple ID.*coming soon/i });
    expect(google).toBeDisabled();
    expect(apple).toBeDisabled();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const mockMutate = vi.fn().mockResolvedValue(undefined);
let searchParamsString = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(searchParamsString),
}));

vi.mock('@/hooks/use-auth', () => ({
  useVerifyEmail: () => ({ mutateAsync: mockMutate, isPending: false }),
}));

import VerifyEmailPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('VerifyEmailPage', () => {
  it('renders the check-your-email state when no token is in the URL', () => {
    searchParamsString = '';
    mockMutate.mockClear();
    render(<VerifyEmailPage />, { wrapper });
    expect(screen.getByText(/check your email/i)).toBeDefined();
    expect(screen.getAllByText(/verification link/i).length).toBeGreaterThan(0);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('auto-submits the token when ?token= is present in the URL', async () => {
    searchParamsString = 'token=plain-verification-token-abc';
    mockMutate.mockClear();
    mockMutate.mockResolvedValueOnce(undefined);
    render(<VerifyEmailPage />, { wrapper });
    await waitFor(() =>
      expect(mockMutate).toHaveBeenCalledWith('plain-verification-token-abc'),
    );
  });

  it('shows the verified confirmation after a successful verify', async () => {
    searchParamsString = 'token=plain-verification-token-abc';
    mockMutate.mockClear();
    mockMutate.mockResolvedValueOnce(undefined);
    render(<VerifyEmailPage />, { wrapper });
    await waitFor(() => expect(screen.getByText(/email verified!/i)).toBeDefined());
    expect(screen.getByText(/pending admin approval/i)).toBeDefined();
  });
});

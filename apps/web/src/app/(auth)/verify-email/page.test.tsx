import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams('memberId=abc-123-def-456'),
}));

vi.mock('@/hooks/use-auth', () => ({
  useVerifyEmail: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import VerifyEmailPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('VerifyEmailPage a11y', () => {
  it('labels each OTP digit and wires one-time-code autocomplete on the first', () => {
    render(<VerifyEmailPage />, { wrapper });
    const digits = Array.from({ length: 6 }, (_, i) =>
      screen.getByLabelText(`Verification code digit ${i + 1}`),
    );
    expect(digits).toHaveLength(6);
    expect(digits[0]).toHaveAttribute('autocomplete', 'one-time-code');
    expect(digits[1]).toHaveAttribute('autocomplete', 'off');
  });

  it('groups the OTP boxes under a labelled group', () => {
    render(<VerifyEmailPage />, { wrapper });
    expect(screen.getByRole('group', { name: /verification code/i })).toBeDefined();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/hooks/use-auth', () => ({
  useSignup: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const listPublic = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    branches: {
      listPublic: () => listPublic(),
    },
  },
}));

import SignupPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('SignupPage a11y', () => {
  it('exposes a progressbar for the step indicator', async () => {
    listPublic.mockResolvedValue({ data: [] });
    render(<SignupPage />, { wrapper });
    await waitFor(() => expect(listPublic).toHaveBeenCalled());
    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuenow', '1');
    expect(progress).toHaveAttribute('aria-valuemax', '3');
  });

  it('triggers branch-load failure state on rejected fetch', async () => {
    listPublic.mockRejectedValue(new Error('network down'));
    render(<SignupPage />, { wrapper });
    await waitFor(() => expect(listPublic).toHaveBeenCalled());
  });
});

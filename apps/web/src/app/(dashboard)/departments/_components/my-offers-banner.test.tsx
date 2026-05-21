import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/hooks/use-departments', () => ({
  useRespondToDepartmentOffer: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { MyOffersBanner } from './my-offers-banner';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('MyOffersBanner', () => {
  it('renders nothing when there are no offers', () => {
    const { container } = render(<MyOffersBanner offers={[]} />, { wrapper });
    expect(container.textContent ?? '').toBe('');
  });

  it('renders Accept and Decline actions for each offer', () => {
    const offers = [
      {
        id: 'o-1',
        branchDepartmentId: 'bd-1',
        branchName: 'Main Branch',
        departmentName: 'Worship',
        status: 'offered',
        probationDays: 30,
        offerExpiresAt: '2026-07-01T18:00:00Z',
        offerMessage: 'We loved meeting you — please join us.',
      },
    ];

    render(<MyOffersBanner offers={offers as never} />, { wrapper });

    // Source uses a curly apostrophe (&rsquo;) — match the surrounding text instead.
    expect(screen.getByText(/been offered a spot in Worship/i)).toBeInTheDocument();
    expect(screen.getByText(/30-day probation/i)).toBeInTheDocument();
    expect(screen.getByText(/We loved meeting you/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accept offer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Decline/i })).toBeInTheDocument();
  });
});

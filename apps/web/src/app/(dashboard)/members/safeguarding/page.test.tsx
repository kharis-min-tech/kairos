import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { UnguardedMinor } from '@kairos/types';

let minors: UnguardedMinor[] = [];
let isLoading = false;
let isError = false;
let error: { message: string } | null = null;

vi.mock('@/hooks/use-members', () => ({
  useUnguardedMinors: () => ({ data: minors, isLoading, isError, error }),
  // #4 Phase B additions — kept default-empty so existing tests don't break;
  // dormant-minors tests can be added in a follow-up.
  useDormantMinors: () => ({ data: [], isLoading: false, isError: false, error: null }),
  useReviewMinor: () => ({ mutate: vi.fn(), isPending: false }),
}));

import SafeguardingReviewPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const noGuardian: UnguardedMinor = {
  id: 'minor-1',
  firstName: 'Sam',
  lastName: 'Young',
  dateOfBirth: '2015-04-10',
  branchName: 'Central',
  guardianStatus: 'none',
  guardianName: null,
};

const inactiveGuardian: UnguardedMinor = {
  id: 'minor-2',
  firstName: 'Ada',
  lastName: 'Stone',
  dateOfBirth: '2017-09-01',
  branchName: 'Riverside',
  guardianStatus: 'inactive',
  guardianName: 'Mary Stone',
};

beforeEach(() => {
  vi.clearAllMocks();
  minors = [];
  isLoading = false;
  isError = false;
  error = null;
});

describe('SafeguardingReviewPage', () => {
  it('renders both guardianStatus chips and links each minor to their detail page', () => {
    minors = [noGuardian, inactiveGuardian];
    render(<SafeguardingReviewPage />, { wrapper });

    // "no guardian" chip
    expect(screen.getByText('No guardian')).toBeInTheDocument();

    // "inactive" chip surfaces the guardian name
    expect(screen.getByText(/Guardian inactive/)).toBeInTheDocument();
    expect(screen.getByText(/Mary Stone/)).toBeInTheDocument();

    // names link to /members/[id]
    const samLink = screen.getByRole('link', { name: /Sam Young/ });
    expect(samLink).toHaveAttribute('href', '/members/minor-1');
    const adaLink = screen.getByRole('link', { name: /Ada Stone/ });
    expect(adaLink).toHaveAttribute('href', '/members/minor-2');
  });

  it('shows a reassuring empty state when no minors need attention', () => {
    minors = [];
    render(<SafeguardingReviewPage />, { wrapper });

    expect(screen.getByText('No minors currently need attention')).toBeInTheDocument();
    expect(screen.queryByText('No guardian')).not.toBeInTheDocument();
  });

  it('shows an access (403) state and surfaces the API error message on error', () => {
    isError = true;
    error = { message: 'Forbidden: safeguarding access required' };
    render(<SafeguardingReviewPage />, { wrapper });

    expect(
      screen.getByText("You don't have safeguarding access to this list"),
    ).toBeInTheDocument();
    expect(screen.getByText('Forbidden: safeguarding access required')).toBeInTheDocument();
    // does not render the list or empty state
    expect(screen.queryByText('No minors currently need attention')).not.toBeInTheDocument();
  });

  it('shows a skeleton while loading (no spinner, no list)', () => {
    isLoading = true;
    const { container } = render(<SafeguardingReviewPage />, { wrapper });

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(screen.queryByText('No minors currently need attention')).not.toBeInTheDocument();
  });
});

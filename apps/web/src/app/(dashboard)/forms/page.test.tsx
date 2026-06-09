import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

let capabilities: { visibleFormTypes: string[]; canSeeProspects: boolean } = {
  visibleFormTypes: ['altar_call', 'first_time_visitor', 'baptism', 'testimony', 'baby_naming', 'baby_dedication'],
  canSeeProspects: true,
};

vi.mock('@/hooks/use-forms', () => ({
  useMyFormCapabilities: () => ({ data: capabilities, isLoading: false }),
}));

import FormsLandingPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  capabilities = {
    visibleFormTypes: ['altar_call', 'first_time_visitor', 'baptism', 'testimony', 'baby_naming', 'baby_dedication'],
    canSeeProspects: true,
  };
});

describe('FormsLandingPage', () => {
  it('shows the form cards to every caller', () => {
    capabilities = { visibleFormTypes: [], canSeeProspects: false };
    render(<FormsLandingPage />, { wrapper });
    // The 6 form cards render regardless of admin access.
    expect(screen.getAllByText(/Altar Call/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Baptism/i).length).toBeGreaterThan(0);
  });

  it('hides the Administration section for a caller with no visible forms and no prospects', () => {
    capabilities = { visibleFormTypes: [], canSeeProspects: false };
    render(<FormsLandingPage />, { wrapper });
    expect(screen.queryByText(/^Administration$/)).toBeNull();
    expect(screen.queryByText(/^Submissions$/)).toBeNull();
    expect(screen.queryByText(/Dormant prospects/i)).toBeNull();
  });

  it('shows Submissions but NOT Prospects for an Admin-dept member (FRONT_DESK forms only)', () => {
    capabilities = { visibleFormTypes: ['altar_call', 'first_time_visitor', 'baptism'], canSeeProspects: false };
    render(<FormsLandingPage />, { wrapper });
    expect(screen.getByText(/^Submissions$/)).toBeDefined();
    expect(screen.queryByText(/Dormant prospects/i)).toBeNull();
  });

  it('shows both Submissions and Prospects for an Admin-dept leader (or pastor / admin)', () => {
    capabilities = {
      visibleFormTypes: ['altar_call', 'first_time_visitor', 'baptism', 'testimony', 'baby_naming', 'baby_dedication'],
      canSeeProspects: true,
    };
    render(<FormsLandingPage />, { wrapper });
    expect(screen.getByText(/^Submissions$/)).toBeDefined();
    expect(screen.getByText(/Dormant prospects/i)).toBeDefined();
  });
});

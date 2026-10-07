import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

let capabilities: { visibleFormTypes: string[]; canSeeAttendees: boolean } = {
  visibleFormTypes: ['altar_call', 'first_time_visitor', 'baptism', 'testimony', 'baby_naming', 'baby_dedication'],
  canSeeAttendees: true,
};

vi.mock('@/hooks/use-forms', () => ({
  useMyFormCapabilities: () => ({ data: capabilities, isLoading: false }),
}));

import { FORM_DEFINITIONS, FORM_TYPES } from '@kairos/types';
import FormsLandingPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  capabilities = {
    visibleFormTypes: ['altar_call', 'first_time_visitor', 'baptism', 'testimony', 'baby_naming', 'baby_dedication'],
    canSeeAttendees: true,
  };
});

describe('FormsLandingPage', () => {
  it('shows the form cards to every caller', () => {
    capabilities = { visibleFormTypes: [], canSeeAttendees: false };
    render(<FormsLandingPage />, { wrapper });
    // Every form card renders regardless of admin access, each one titled and
    // described by its own definition — the single source both platforms read.
    for (const type of FORM_TYPES) {
      const definition = FORM_DEFINITIONS[type];
      expect(screen.getByText(definition.title)).toBeInTheDocument();
      expect(screen.getByText(definition.description!)).toBeInTheDocument();
    }
  });

  it('hides the Administration section for a caller with no visible forms and no attendees', () => {
    capabilities = { visibleFormTypes: [], canSeeAttendees: false };
    render(<FormsLandingPage />, { wrapper });
    expect(screen.queryByText(/^Administration$/)).toBeNull();
    expect(screen.queryByText(/^Submissions$/)).toBeNull();
    expect(screen.queryByText(/Dormant attendees/i)).toBeNull();
  });

  it('shows Submissions but NOT Attendees for an Admin-dept member (FRONT_DESK forms only)', () => {
    capabilities = { visibleFormTypes: ['altar_call', 'first_time_visitor', 'baptism'], canSeeAttendees: false };
    render(<FormsLandingPage />, { wrapper });
    expect(screen.getByText(/^Submissions$/)).toBeDefined();
    expect(screen.queryByText(/Dormant attendees/i)).toBeNull();
  });

  it('shows both Submissions and Attendees for an Admin-dept leader (or pastor / admin)', () => {
    capabilities = {
      visibleFormTypes: ['altar_call', 'first_time_visitor', 'baptism', 'testimony', 'baby_naming', 'baby_dedication'],
      canSeeAttendees: true,
    };
    render(<FormsLandingPage />, { wrapper });
    expect(screen.getByText(/^Submissions$/)).toBeDefined();
    expect(screen.getByText(/Dormant attendees/i)).toBeDefined();
  });
});

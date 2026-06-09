import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { DormantProspect } from '@kairos/types';

let role: string = 'leader';
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector?: (s: { activeRole: string }) => unknown) =>
    selector ? selector({ activeRole: role }) : { activeRole: role },
}));

let prospects: DormantProspect[] = [];
let capabilities: { visibleFormTypes: string[]; canSeeProspects: boolean } = {
  visibleFormTypes: ['altar_call'],
  canSeeProspects: true,
};
const archiveMutate = vi.fn();

vi.mock('@/hooks/use-forms', () => ({
  useMyFormCapabilities: () => ({ data: capabilities, isLoading: false }),
  useDormantProspects: () => ({
    data: prospects,
    isLoading: false,
    isError: false,
    error: null,
  }),
  useArchiveProspects: () => ({
    mutateAsync: archiveMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

import ProspectsPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const rows: DormantProspect[] = [
  { id: 'p-1', firstName: 'Old', lastName: 'Lead', phone: '0700', createdAt: new Date('2026-01-01').toISOString(), hasEnrollment: false },
  { id: 'p-2', firstName: 'Stale', lastName: 'Shell', phone: null, createdAt: new Date('2026-01-02').toISOString(), hasEnrollment: true },
];

beforeEach(() => {
  vi.clearAllMocks();
  role = 'leader';
  prospects = rows;
  capabilities = { visibleFormTypes: ['altar_call'], canSeeProspects: true };
  archiveMutate.mockResolvedValue({ archived: 1 });
});

describe('ProspectsPage', () => {
  it('blocks a caller without canSeeProspects', () => {
    capabilities = { visibleFormTypes: [], canSeeProspects: false };
    render(<ProspectsPage />, { wrapper });
    expect(screen.getByText(/Not authorised/)).toBeInTheDocument();
  });

  it('renders dormant rows for a leader', () => {
    render(<ProspectsPage />, { wrapper });
    expect(screen.getByText('Old Lead')).toBeInTheDocument();
    expect(screen.getByText('Stale Shell')).toBeInTheDocument();
    expect(screen.getByText('Has enrollment')).toBeInTheDocument();
  });

  it('archives the selected ids after confirming', async () => {
    const user = userEvent.setup();
    render(<ProspectsPage />, { wrapper });

    await user.click(screen.getByRole('checkbox', { name: /Select Old Lead/ }));
    await user.click(screen.getByRole('button', { name: /Archive selected/ }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^Archive$/ }));

    await waitFor(() => expect(archiveMutate).toHaveBeenCalledTimes(1));
    expect(archiveMutate).toHaveBeenCalledWith({ memberIds: ['p-1'] });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { FormSubmission } from '@kairos/types';

let role: string = 'leader';
const authState = () => ({ activeRole: role });
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector?: (s: { activeRole: string }) => unknown) =>
    selector ? selector(authState()) : authState(),
}));

let listParams: unknown;
let submissions: FormSubmission[] = [];
let capabilities: { visibleFormTypes: string[]; canSeeAttendees: boolean } = {
  visibleFormTypes: ['altar_call', 'first_time_visitor', 'baptism', 'testimony', 'baby_naming', 'baby_dedication'],
  canSeeAttendees: true,
};
const updateMutate = vi.fn();
const exportMutate = vi.fn();

vi.mock('@/hooks/use-forms', () => ({
  useMyFormCapabilities: () => ({ data: capabilities, isLoading: false }),
  useFormSubmissions: (params: unknown) => {
    listParams = params;
    return { data: submissions, isLoading: false, isError: false, error: null };
  },
  useExportFormSubmissions: () => ({ mutateAsync: exportMutate, isPending: false }),
  useUpdateFormSubmission: () => ({
    mutateAsync: updateMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

import SubmissionsPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const baptism: FormSubmission = {
  id: 'sub-1',
  formType: 'baptism',
  branchId: 'b-1',
  submittedBy: 'me',
  subjectMemberId: null,
  payload: { firstName: 'Mary', lastName: 'Jane', phone: '0700' },
  status: 'new',
  linkedEntityType: null,
  linkedEntityId: null,
  notes: null,
  createdAt: new Date('2026-01-02').toISOString(),
  updatedAt: new Date('2026-01-02').toISOString(),
} as unknown as FormSubmission;

const anonTestimony: FormSubmission = {
  id: 'sub-2',
  formType: 'testimony',
  branchId: 'b-1',
  submittedBy: 'me',
  subjectMemberId: null,
  payload: {
    firstName: 'Secret',
    lastName: 'Person',
    phone: '0701',
    shareAnonymously: true,
    happyToShareSunday: false,
    acknowledged: true,
    category: 'Salvation',
    details: 'private',
    todaysDate: '2026-01-01',
    dateOfTestimony: '2026-01-01',
  },
  status: 'reviewed',
  linkedEntityType: null,
  linkedEntityId: null,
  notes: null,
  createdAt: new Date('2026-01-03').toISOString(),
  updatedAt: new Date('2026-01-03').toISOString(),
} as unknown as FormSubmission;

beforeEach(() => {
  vi.clearAllMocks();
  role = 'leader';
  submissions = [baptism, anonTestimony];
  capabilities = {
    visibleFormTypes: ['altar_call', 'first_time_visitor', 'baptism', 'testimony', 'baby_naming', 'baby_dedication'],
    canSeeAttendees: true,
  };
  updateMutate.mockResolvedValue({ id: 'sub-1' });
  exportMutate.mockResolvedValue(new Blob(['a'], { type: 'text/csv' }));
});

describe('SubmissionsPage', () => {
  it('blocks a caller with an empty visible set', () => {
    capabilities = { visibleFormTypes: [], canSeeAttendees: false };
    render(<SubmissionsPage />, { wrapper });
    expect(screen.getByText(/Not authorised/)).toBeInTheDocument();
    expect(screen.queryByText(/Form Submissions/)).not.toBeInTheDocument();
  });

  it('renders rows for a leader', () => {
    render(<SubmissionsPage />, { wrapper });
    expect(screen.getByText('Mary Jane')).toBeInTheDocument();
    expect(screen.getByText('Baptism')).toBeInTheDocument();
  });

  it('hides the name for anonymous testimonies in the table', () => {
    render(<SubmissionsPage />, { wrapper });
    expect(screen.queryByText('Secret Person')).not.toBeInTheDocument();
    expect(screen.getAllByText('(anonymous)').length).toBeGreaterThan(0);
  });

  it('disables Export until a form type is chosen', async () => {
    const user = userEvent.setup();
    render(<SubmissionsPage />, { wrapper });
    const exportBtn = screen.getByRole('button', { name: /Export CSV/ });
    expect(exportBtn).toBeDisabled();

    // Choose a form type filter
    await user.click(screen.getByText('All forms'));
    await user.click(screen.getByRole('button', { name: 'Baptism' }));
    expect(screen.getByRole('button', { name: /Export CSV/ })).toBeEnabled();
  });

  it('forwards changed status filter to the hook', async () => {
    const user = userEvent.setup();
    render(<SubmissionsPage />, { wrapper });
    await user.click(screen.getByText('All statuses'));
    await user.click(screen.getByRole('button', { name: 'Reviewed' }));
    await waitFor(() => {
      expect((listParams as { status?: string }).status).toBe('reviewed');
    });
  });

  it('opens the review drawer and saves a status change', async () => {
    const user = userEvent.setup();
    render(<SubmissionsPage />, { wrapper });
    await user.click(screen.getByText('Mary Jane'));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'New' }));
    await user.click(within(dialog).getByRole('button', { name: 'Converted' }));
    await user.click(within(dialog).getByRole('button', { name: /^Save$/ }));

    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
    expect(updateMutate.mock.calls[0]![0]).toMatchObject({
      id: 'sub-1',
      data: { status: 'converted' },
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const authState = { user: { id: 'me', homeBranchId: 'branch-1', branchName: 'Central' } };
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector?: (s: typeof authState) => unknown) =>
    selector ? selector(authState) : authState,
}));

const submitMutate = vi.fn();
let submitPending = false;
let submitError: Error | null = null;
let searchResults: Array<{
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  memberType: string;
}> = [];

vi.mock('@/hooks/use-forms', () => ({
  useSubmitForm: () => ({
    mutateAsync: submitMutate,
    isPending: submitPending,
    isError: !!submitError,
    error: submitError,
  }),
  useFormMemberSearch: () => ({ data: searchResults, isFetching: false }),
}));

import { AltarCallForm } from './altar-call-form';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  submitPending = false;
  submitError = null;
  searchResults = [];
  submitMutate.mockResolvedValue({ id: 'sub-1' });
});

// Phase 2 — every form now blocks submit until the privacy-notice tickbox is acknowledged.
// All existing tests that expect submit to fire need to tick consent first.
async function tickConsent(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
}

describe('AltarCallForm', () => {
  it('blocks submit and shows errors when required fields are empty', async () => {
    const user = userEvent.setup();
    render(<AltarCallForm />, { wrapper });
    await tickConsent(user);
    await user.click(screen.getByRole('button', { name: /^Submit$/ }));
    expect(await screen.findByText(/First name is required/)).toBeInTheDocument();
    expect(screen.getByText(/Last name is required/)).toBeInTheDocument();
    expect(submitMutate).not.toHaveBeenCalled();
  });

  it('disables the submit button until the privacy-notice tickbox is acknowledged', async () => {
    render(<AltarCallForm />, { wrapper });
    const btn = screen.getByRole('button', { name: /^Submit$/ });
    expect(btn).toHaveProperty('disabled', true);
  });

  it('submits a new contact (no subjectMemberId) with the payload shape', async () => {
    const user = userEvent.setup();
    render(<AltarCallForm />, { wrapper });
    await user.type(screen.getByLabelText(/First name/), 'James');
    await user.type(screen.getByLabelText(/Last name/), 'Smith');
    await user.type(screen.getByLabelText(/^Phone/), '07700900123');
    await tickConsent(user);
    await user.click(screen.getByRole('button', { name: /^Submit$/ }));

    await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));
    const call = submitMutate.mock.calls[0]![0];
    expect(call.formType).toBe('altar_call');
    expect(call.data.subjectMemberId).toBeUndefined();
    expect(call.data.payload).toMatchObject({
      firstName: 'James',
      lastName: 'Smith',
      phone: '07700900123',
    });
    expect(call.data.payload.todaysDate).toBeTruthy();
  });

  it('selecting a search result sets subjectMemberId and prepopulates fields', async () => {
    searchResults = [
      { id: 'm-9', firstName: 'Ada', lastName: 'Lovelace', phone: '0700', memberType: 'member' },
    ];
    const user = userEvent.setup();
    render(<AltarCallForm />, { wrapper });

    await user.type(screen.getByLabelText(/Find an existing person/), 'ada');
    await user.click(await screen.findByRole('button', { name: /Ada Lovelace/ }));

    expect(screen.getByLabelText(/First name/)).toHaveValue('Ada');
    expect(screen.getByLabelText(/Last name/)).toHaveValue('Lovelace');

    await tickConsent(user);
    await user.click(screen.getByRole('button', { name: /^Submit$/ }));
    await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));
    expect(submitMutate.mock.calls[0]![0].data.subjectMemberId).toBe('m-9');
  });
});

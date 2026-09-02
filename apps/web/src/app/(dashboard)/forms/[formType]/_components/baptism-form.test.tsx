import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const authState = { user: { id: 'me', branchName: 'Central' } };
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector?: (s: typeof authState) => unknown) =>
    selector ? selector(authState) : authState,
}));

const submitMutate = vi.fn();
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
    isPending: false,
    isError: false,
    error: null,
  }),
  useFormMemberSearch: () => ({ data: searchResults, isFetching: false }),
}));

import { BaptismForm } from './baptism-form';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  searchResults = [];
  submitMutate.mockResolvedValue({ id: 's-1' });
});

async function tickConsent(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
}

describe('BaptismForm', () => {
  it('blocks submit when required fields are empty', async () => {
    const user = userEvent.setup();
    render(<BaptismForm />, { wrapper });
    await tickConsent(user);
    await user.click(screen.getByRole('button', { name: /^Submit$/ }));
    expect(await screen.findByText(/First name is required/)).toBeInTheDocument();
    expect(submitMutate).not.toHaveBeenCalled();
  });

  it('submits with the baptism payload shape and shows the success state', async () => {
    const user = userEvent.setup();
    render(<BaptismForm />, { wrapper });
    await user.type(screen.getByLabelText(/First name/), 'Mary');
    await user.type(screen.getByLabelText(/Last name/), 'Jane');
    await user.type(screen.getByLabelText(/^Phone/), '0701');
    await tickConsent(user);
    await user.click(screen.getByRole('button', { name: /^Submit$/ }));

    await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));
    expect(submitMutate.mock.calls[0]![0]).toMatchObject({
      formType: 'baptism',
      data: {
        payload: { firstName: 'Mary', lastName: 'Jane', phone: '0701' },
        consentPolicyVersion: '2026-06-v1',
      },
    });
    expect(submitMutate.mock.calls[0]![0].data.consentGivenAt).toBeTruthy();
    expect(await screen.findByText(/Baptism request submitted/)).toBeInTheDocument();
  });

  it('selecting a member from the typeahead links the record and pre-fills name/phone', async () => {
    searchResults = [
      { id: 'm-77', firstName: 'Ada', lastName: 'Lovelace', phone: '0700', memberType: 'member' },
    ];
    const user = userEvent.setup();
    render(<BaptismForm />, { wrapper });

    await user.type(screen.getByLabelText(/Find the baptism candidate/), 'ada');
    await user.click(await screen.findByRole('button', { name: /Ada Lovelace/ }));

    // Linked-state note + pre-filled fields.
    expect(
      screen.getByText(/Linked to an existing person. Their record will be used\./),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/First name/)).toHaveValue('Ada');
    expect(screen.getByLabelText(/Last name/)).toHaveValue('Lovelace');
    expect(screen.getByLabelText(/^Phone/)).toHaveValue('0700');
  });

  it('submitting after selecting a member carries subjectMemberId in the submit call', async () => {
    searchResults = [
      { id: 'm-77', firstName: 'Ada', lastName: 'Lovelace', phone: '0700', memberType: 'member' },
    ];
    const user = userEvent.setup();
    render(<BaptismForm />, { wrapper });

    await user.type(screen.getByLabelText(/Find the baptism candidate/), 'ada');
    await user.click(await screen.findByRole('button', { name: /Ada Lovelace/ }));
    await tickConsent(user);
    await user.click(screen.getByRole('button', { name: /^Submit$/ }));

    await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));
    const call = submitMutate.mock.calls[0]![0];
    expect(call.formType).toBe('baptism');
    expect(call.data.subjectMemberId).toBe('m-77');
    expect(call.data.payload).toEqual({ firstName: 'Ada', lastName: 'Lovelace', phone: '0700' });
  });
});

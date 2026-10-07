import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ALTAR_CALL_FORM, BAPTISM_FORM } from '@kairos/types';
import type { FormMemberSearchResult } from '@kairos/types';

const authState = { user: { id: 'me', homeBranchId: 'branch-1', branchName: 'Central' } };
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector?: (s: typeof authState) => unknown) =>
    selector ? selector(authState) : authState,
}));

const submitMutate = vi.fn();
let searchResults: FormMemberSearchResult[] = [];
vi.mock('@/hooks/use-forms', () => ({
  useSubmitForm: () => ({
    mutateAsync: submitMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
  useFormMemberSearch: () => ({ data: searchResults, isFetching: false }),
}));

import { DeclarativeForm } from './declarative-form';

const ADA: FormMemberSearchResult = {
  id: 'm-9',
  firstName: 'Ada',
  lastName: 'Lovelace',
  phone: '0700',
  memberType: 'member',
};

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

async function linkAda(user: ReturnType<typeof userEvent.setup>, controlName: RegExp) {
  searchResults = [ADA];
  await user.type(screen.getByLabelText(controlName), 'ada');
  await user.click(await screen.findByRole('option', { name: /^Ada Lovelace/ }));
}

beforeEach(() => {
  vi.clearAllMocks();
  searchResults = [];
  submitMutate.mockResolvedValue({ id: 's-1' });
});

// Re-homed from the deleted bespoke `AltarCallForm` and `BaptismForm`. Both
// capture a person's name and phone and may link them to a record they already
// have, so they exercise the same path and differ only in what the payload is
// called and what the success screen says.
describe('DeclarativeForm — New Believers Class (altar call)', () => {
  function renderForm() {
    return render(<DeclarativeForm definition={ALTAR_CALL_FORM} />, { wrapper });
  }

  it('pre-fills today’s date from the definition’s default', () => {
    renderForm();
    // The bespoke form seeded this in component state; the definition now says
    // `defaultValue: 'today'` and both renderers honour it.
    expect(screen.queryByRole('button', { name: /Select date/ })).not.toBeInTheDocument();
  });

  it('blocks submit and names every missing required field', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
    await user.click(screen.getByRole('button', { name: /^Submit$/ }));

    expect(await screen.findByText(/First name is required/)).toBeInTheDocument();
    expect(screen.getByText(/Last name is required/)).toBeInTheDocument();
    expect(screen.getByText(/Phone is required/)).toBeInTheDocument();
    expect(screen.queryByText(/Today’s date is required/)).not.toBeInTheDocument();
    expect(submitMutate).not.toHaveBeenCalled();
  });

  it('submits a new contact with no subjectMemberId, and says a contact was created', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/^First name/), 'Tunde');
    await user.type(screen.getByLabelText(/^Last name/), 'Bakare');
    await user.type(screen.getByLabelText(/^Phone/), '07123456789');
    await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
    await user.click(screen.getByRole('button', { name: /^Submit$/ }));
    await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));

    const call = submitMutate.mock.calls[0]![0];
    expect(call.formType).toBe('altar_call');
    expect(call.data.subjectMemberId).toBeUndefined();
    expect(call.data.payload).toMatchObject({
      firstName: 'Tunde',
      lastName: 'Bakare',
      phone: '07123456789',
    });
    expect(call.data.payload.todaysDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    expect(await screen.findByText('Enrollment created')).toBeInTheDocument();
    expect(screen.getByText(/A new contact was created and enrolled/)).toBeInTheDocument();
  });

  it('links an existing person, pre-fills their details, and says they were linked', async () => {
    const user = userEvent.setup();
    renderForm();
    await linkAda(user, /Find an existing person/);

    expect(screen.getByLabelText(/^First name/)).toHaveValue('Ada');
    expect(screen.getByLabelText(/^Last name/)).toHaveValue('Lovelace');
    expect(screen.getByLabelText(/^Phone/)).toHaveValue('0700');

    await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
    await user.click(screen.getByRole('button', { name: /^Submit$/ }));
    await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));

    expect(submitMutate.mock.calls[0]![0].data.subjectMemberId).toBe('m-9');
    // The altar call is the one form whose success line changes on linking.
    expect(await screen.findByText('Enrollment created')).toBeInTheDocument();
    expect(screen.getByText(/This person was linked and enrolled/)).toBeInTheDocument();
  });
});

describe('DeclarativeForm — baptism', () => {
  function renderForm() {
    return render(<DeclarativeForm definition={BAPTISM_FORM} />, { wrapper });
  }

  it('blocks submit when the candidate’s details are empty', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
    await user.click(screen.getByRole('button', { name: /^Submit$/ }));
    expect(await screen.findByText(/First name is required/)).toBeInTheDocument();
    expect(submitMutate).not.toHaveBeenCalled();
  });

  it('names the candidate on its subject link rather than "an existing person"', () => {
    renderForm();
    expect(screen.getByLabelText(/Find the baptism candidate/)).toBeInTheDocument();
  });

  it('submits the baptism payload and its own success copy', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/^First name/), 'Mary');
    await user.type(screen.getByLabelText(/^Last name/), 'Jane');
    await user.type(screen.getByLabelText(/^Phone/), '0700');
    await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
    await user.click(screen.getByRole('button', { name: /^Submit$/ }));
    await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));

    const call = submitMutate.mock.calls[0]![0];
    expect(call.formType).toBe('baptism');
    expect(call.data.payload).toEqual({ firstName: 'Mary', lastName: 'Jane', phone: '0700' });

    expect(await screen.findByText('Baptism request submitted')).toBeInTheDocument();
  });

  it('carries subjectMemberId once a candidate is linked', async () => {
    const user = userEvent.setup();
    renderForm();
    await linkAda(user, /Find the baptism candidate/);
    await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
    await user.click(screen.getByRole('button', { name: /^Submit$/ }));
    await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));
    expect(submitMutate.mock.calls[0]![0].data.subjectMemberId).toBe('m-9');
  });
});

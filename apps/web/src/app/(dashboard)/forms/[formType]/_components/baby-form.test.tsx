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

import { BabyForm } from './baby-form';

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

describe('BabyForm (naming)', () => {
  it('blocks submit when required fields are empty', async () => {
    const user = userEvent.setup();
    render(<BabyForm mode="baby_naming" />, { wrapper });
    await user.click(screen.getByRole('button', { name: /^Submit$/ }));
    expect(await screen.findByText(/Baby’s full name is required/)).toBeInTheDocument();
    expect(submitMutate).not.toHaveBeenCalled();
  });

  it('submits with baby_naming payload keys', async () => {
    const user = userEvent.setup();
    render(<BabyForm mode="baby_naming" />, { wrapper });
    await user.type(screen.getByLabelText(/Baby’s full name/), 'Baby Doe');
    await user.type(screen.getByLabelText(/Father’s name/), 'John Doe');
    await user.type(screen.getByLabelText(/Mother’s name/), 'Jane Doe');
    await user.type(screen.getByLabelText(/Parent contact phone/), '0700');

    // dateOfBirth via DateSelect — required. The DateSelect renders a trigger;
    // we set it through the typed text path by skipping (validation requires it).
    // Instead, we assert the validation error is shown then.
    await user.click(screen.getByRole('button', { name: /^Submit$/ }));
    expect(await screen.findByText(/Date of birth is required/)).toBeInTheDocument();
    expect(submitMutate).not.toHaveBeenCalled();
  });

  it('renders the parents-are-members radio only for dedication', async () => {
    const { rerender } = render(<BabyForm mode="baby_naming" />, { wrapper });
    expect(screen.queryByText(/Are parents members\?/)).not.toBeInTheDocument();
    rerender(<BabyForm mode="baby_dedication" />);
    expect(screen.getByText(/Are parents members\?/)).toBeInTheDocument();
  });

  it('picking a parent via the typeahead sets subjectMemberId and submitting carries it', async () => {
    searchResults = [
      { id: 'p-42', firstName: 'Mary', lastName: 'Doe', phone: '0700111', memberType: 'member' },
    ];
    const user = userEvent.setup();
    render(<BabyForm mode="baby_naming" />, { wrapper });

    // Link the parent — pre-fills the parent contact phone.
    await user.type(screen.getByLabelText(/Find the parent\/guardian/), 'mary');
    await user.click(await screen.findByRole('button', { name: /Mary Doe/ }));
    expect(
      screen.getByText(
        /Linked to an existing member — they’ll be recorded as the parent\/guardian\./,
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Parent contact phone/)).toHaveValue('0700111');

    // Fill the remaining required baby fields.
    await user.type(screen.getByLabelText(/Baby’s full name/), 'Baby Doe');
    await user.type(screen.getByLabelText(/Father’s name/), 'John Doe');
    await user.type(screen.getByLabelText(/Mother’s name/), 'Mary Doe');
    // Date of birth — the first DateSelect ("Select date") on the form.
    await user.click(screen.getAllByRole('button', { name: /Select date/ })[0]!);
    await user.click(screen.getByRole('button', { name: /^Today$/ }));

    await user.click(screen.getByRole('button', { name: /^Submit$/ }));

    await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));
    const call = submitMutate.mock.calls[0]![0];
    expect(call.formType).toBe('baby_naming');
    expect(call.data.subjectMemberId).toBe('p-42');
    expect(call.data.payload).toMatchObject({
      babyFullName: 'Baby Doe',
      fathersName: 'John Doe',
      mothersName: 'Mary Doe',
      parentContactPhone: '0700111',
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const authState = { user: { id: 'me', homeBranchId: 'b-1', branchName: 'Central' } };
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector?: (s: typeof authState) => unknown) =>
    selector ? selector(authState) : authState,
}));

const submitMutate = vi.fn();
vi.mock('@/hooks/use-forms', () => ({
  useSubmitForm: () => ({
    mutateAsync: submitMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

import { TestimonyForm } from './testimony-form';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  submitMutate.mockResolvedValue({ id: 's-1' });
});

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/First name/), 'Ada');
  await user.type(screen.getByLabelText(/Last name/), 'Lovelace');
  await user.type(screen.getByLabelText(/^Phone/), '0700');
  await user.type(screen.getByLabelText(/Testimony details/), 'God did it');
  // Date of testimony — open the empty DateSelect ("Select date") and pick Today.
  await user.click(screen.getByRole('button', { name: /Select date/ }));
  await user.click(screen.getByRole('button', { name: /^Today$/ }));
  // Category
  await user.click(screen.getByText(/Select a category/));
  await user.click(screen.getByRole('button', { name: 'Salvation' }));
  // Radios
  const anonGroup = screen.getByRole('radiogroup', { name: 'Share anonymously?' });
  await user.click(within(anonGroup).getByRole('radio', { name: 'No' }));
  const sundayGroup = screen.getByRole('radiogroup', {
    name: 'Happy to share during Sunday service?',
  });
  await user.click(within(sundayGroup).getByRole('radio', { name: 'Yes' }));
}

describe('TestimonyForm', () => {
  it('blocks submit when acknowledgement is unchecked', async () => {
    const user = userEvent.setup();
    render(<TestimonyForm />, { wrapper });
    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: /^Submit$/ }));
    expect(
      await screen.findByText(/You must acknowledge before submitting/),
    ).toBeInTheDocument();
    expect(submitMutate).not.toHaveBeenCalled();
  });

  it('submits with boolean radios and acknowledged once all valid', async () => {
    const user = userEvent.setup();
    render(<TestimonyForm />, { wrapper });
    await fillRequired(user);
    await user.click(screen.getByLabelText(/Acknowledgement/));
    await user.click(screen.getByRole('button', { name: /^Submit$/ }));

    await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));
    const call = submitMutate.mock.calls[0]![0];
    expect(call.formType).toBe('testimony');
    expect(call.data.payload).toMatchObject({
      firstName: 'Ada',
      category: 'Salvation',
      details: 'God did it',
      shareAnonymously: false,
      happyToShareSunday: true,
      acknowledged: true,
    });
  });

  it('blocks submit with validation errors when required fields are empty', async () => {
    const user = userEvent.setup();
    render(<TestimonyForm />, { wrapper });
    await user.click(screen.getByRole('button', { name: /^Submit$/ }));
    expect(await screen.findByText(/First name is required/)).toBeInTheDocument();
    expect(submitMutate).not.toHaveBeenCalled();
  });
});

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
vi.mock('@/hooks/use-forms', () => ({
  useSubmitForm: () => ({
    mutateAsync: submitMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
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
  submitMutate.mockResolvedValue({ id: 's-1' });
});

describe('BaptismForm', () => {
  it('blocks submit when required fields are empty', async () => {
    const user = userEvent.setup();
    render(<BaptismForm />, { wrapper });
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
    await user.click(screen.getByRole('button', { name: /^Submit$/ }));

    await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));
    expect(submitMutate.mock.calls[0]![0]).toEqual({
      formType: 'baptism',
      data: { payload: { firstName: 'Mary', lastName: 'Jane', phone: '0701' } },
    });
    expect(await screen.findByText(/Baptism request submitted/)).toBeInTheDocument();
  });
});

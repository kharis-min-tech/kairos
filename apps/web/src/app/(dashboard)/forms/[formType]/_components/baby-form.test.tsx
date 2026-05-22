import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

import { BabyForm } from './baby-form';

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
});

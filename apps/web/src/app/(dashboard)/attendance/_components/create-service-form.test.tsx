import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const authState = { user: { id: 'me', homeBranchId: 'branch-1' } };
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector?: (s: typeof authState) => unknown) =>
    selector ? selector(authState) : authState,
}));

vi.mock('@/hooks/use-forms', () => ({
  useFormMemberSearch: () => ({ data: [], isFetching: false }),
}));

vi.mock('@/hooks/use-branches', () => ({
  useBranches: () => ({
    data: [
      { id: 'branch-1', branchName: 'London' },
      { id: 'branch-2', branchName: 'Manchester' },
    ],
  }),
}));

import { CreateServiceForm } from './create-service-form';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CreateServiceForm', () => {
  it('blocks submit and shows the Special-needs-title error when type is Special and title empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ id: 'svc-1' });
    render(<CreateServiceForm onSubmit={onSubmit} canPickBranch={false} />, { wrapper });

    // Switch the type to Special.
    await user.click(screen.getByText('Sunday Service'));
    await user.click(screen.getByText('Special Service'));

    // A date + time are pre-filled (time default 09:00); pick a date.
    await user.click(screen.getByText('Select date'));
    await user.click(screen.getByRole('button', { name: '15' }));

    await user.click(screen.getByRole('button', { name: /Create service/ }));

    expect(await screen.findByText(/special service needs a title/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a valid Special service with a title', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ id: 'svc-1' });
    render(<CreateServiceForm onSubmit={onSubmit} canPickBranch={false} />, { wrapper });

    await user.click(screen.getByText('Sunday Service'));
    await user.click(screen.getByText('Special Service'));

    await user.type(screen.getByLabelText(/Service title/i), 'Watchnight');

    await user.click(screen.getByText('Select date'));
    await user.click(screen.getByRole('button', { name: '15' }));

    await user.click(screen.getByRole('button', { name: /Create service/ }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0]![0];
    expect(payload.serviceType).toBe('Special');
    expect(payload.serviceTitle).toBe('Watchnight');
    expect(typeof payload.serviceDate).toBe('string');
  });

  it('submits a Sunday service without a title', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ id: 'svc-2' });
    render(<CreateServiceForm onSubmit={onSubmit} canPickBranch={false} />, { wrapper });

    await user.click(screen.getByText('Select date'));
    await user.click(screen.getByRole('button', { name: '15' }));

    await user.click(screen.getByRole('button', { name: /Create service/ }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0].serviceType).toBe('Sunday');
    expect(onSubmit.mock.calls[0]![0].serviceTitle).toBeUndefined();
  });

  it('hides the branch picker when canPickBranch is false', () => {
    render(<CreateServiceForm onSubmit={vi.fn()} canPickBranch={false} />, { wrapper });
    expect(screen.queryByLabelText('Branch')).not.toBeInTheDocument();
  });

  it('lets an admin pick a non-home branch and sends it as branchId', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ id: 'svc-3' });
    render(<CreateServiceForm onSubmit={onSubmit} canPickBranch={true} />, { wrapper });

    // Picker is shown and defaults to the home branch (London / branch-1).
    await user.click(screen.getByText('London'));
    await user.click(screen.getByText('Manchester'));

    await user.click(screen.getByText('Select date'));
    await user.click(screen.getByRole('button', { name: '15' }));

    await user.click(screen.getByRole('button', { name: /Create service/ }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0].branchId).toBe('branch-2');
  });
});

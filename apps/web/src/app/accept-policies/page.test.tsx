import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const mockReplace = vi.fn();
const mockRecord = vi.fn().mockResolvedValue({ id: 'x' });
let mockStatuses: unknown[] = [];

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ accessToken: 'test-token', logout: vi.fn() }),
}));

vi.mock('@/hooks/use-consent', () => ({
  useMyConsentStatuses: () => ({
    data: { statuses: mockStatuses },
    isLoading: false,
    isError: false,
  }),
  useRecordConsent: () => ({ mutateAsync: mockRecord }),
}));

import AcceptPoliciesPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockReplace.mockReset();
  mockRecord.mockClear();
});

describe('AcceptPoliciesPage', () => {
  it('redirects to /dashboard when nothing is pending', async () => {
    mockStatuses = [
      { consentType: 'acceptable_use', currentVersion: '2026-07-v1', required: true, needsAccept: false },
    ];
    render(<AcceptPoliciesPage />, { wrapper });
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/dashboard'));
  });

  it('lists every pending policy and disables Continue until all checkboxes are ticked', async () => {
    mockStatuses = [
      { consentType: 'acceptable_use', currentVersion: '2026-07-v1', required: true, needsAccept: true },
      { consentType: 'admin_confidentiality', currentVersion: '2026-07-v1', required: true, needsAccept: true },
    ];
    render(<AcceptPoliciesPage />, { wrapper });

    const continueBtn = screen.getByRole('button', { name: /accept & continue/i });
    expect(continueBtn).toBeDisabled();

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    fireEvent.click(checkboxes[0]!);
    expect(continueBtn).toBeDisabled();
    fireEvent.click(checkboxes[1]!);
    expect(continueBtn).toBeEnabled();
  });

  it('records every pending consent in order when Continue fires, then routes to dashboard', async () => {
    mockStatuses = [
      { consentType: 'acceptable_use', currentVersion: '2026-07-v1', required: true, needsAccept: true },
      { consentType: 'admin_confidentiality', currentVersion: '2026-07-v1', required: true, needsAccept: true },
    ];
    render(<AcceptPoliciesPage />, { wrapper });

    for (const cb of screen.getAllByRole('checkbox')) fireEvent.click(cb);
    fireEvent.click(screen.getByRole('button', { name: /accept & continue/i }));

    await waitFor(() => expect(mockRecord).toHaveBeenCalledTimes(2));
    expect(mockRecord).toHaveBeenNthCalledWith(1, {
      consentType: 'acceptable_use',
      granted: true,
    });
    expect(mockRecord).toHaveBeenNthCalledWith(2, {
      consentType: 'admin_confidentiality',
      granted: true,
    });
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/dashboard'));
  });
});

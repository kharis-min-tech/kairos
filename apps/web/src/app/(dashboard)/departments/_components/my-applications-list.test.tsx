import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/hooks/use-departments', () => ({
  useWithdrawDepartmentJoinRequest: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { MyApplicationsList } from './my-applications-list';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('MyApplicationsList', () => {
  it('renders the empty state when there are no pending applications', () => {
    render(<MyApplicationsList items={[]} />, { wrapper });
    expect(screen.getByText(/No applications in progress/i)).toBeInTheDocument();
  });

  it('renders one row per pending application with status label and Withdraw button', () => {
    const items = [
      {
        id: 'r-1',
        branchDepartmentId: 'bd-1',
        branchName: 'Main Branch',
        departmentName: 'Hospitality',
        status: 'applied',
        interviewScheduledAt: null,
      },
      {
        id: 'r-2',
        branchDepartmentId: 'bd-2',
        branchName: 'Main Branch',
        departmentName: 'Worship',
        status: 'interview_scheduled',
        interviewScheduledAt: '2026-06-01T10:00:00Z',
      },
    ];

    render(<MyApplicationsList items={items as never} />, { wrapper });

    expect(screen.getByText('Hospitality')).toBeInTheDocument();
    expect(screen.getByText(/Applied.*awaiting review/i)).toBeInTheDocument();
    expect(screen.getByText('Worship')).toBeInTheDocument();
    expect(screen.getByText(/Interview scheduled/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Withdraw/i }).length).toBe(2);
  });
});

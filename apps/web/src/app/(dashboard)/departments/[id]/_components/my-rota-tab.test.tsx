import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const useMyRotaMock = vi.fn();
vi.mock('@/hooks/use-me', () => ({
  useMyRota: () => useMyRotaMock(),
}));

import { MyRotaTab } from './my-rota-tab';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('MyRotaTab', () => {
  beforeEach(() => {
    useMyRotaMock.mockReset();
  });

  it('renders the empty state when the user has no duties in this department', () => {
    useMyRotaMock.mockReturnValue({ data: [], isLoading: false, isError: false });
    render(<MyRotaTab branchDepartmentId="bd-1" />, { wrapper });

    expect(screen.getByText(/No upcoming duties for you in this department/i)).toBeInTheDocument();
  });

  it('filters rota rows to this branchDepartmentId', () => {
    useMyRotaMock.mockReturnValue({
      data: [
        {
          assignmentId: 'a-1',
          branchDepartmentId: 'bd-1',
          templateName: 'Sunday Ushers',
          serviceDate: '2026-05-24',
          startTime: '09:00',
          slotRoleName: 'Front of house',
          status: 'confirmed',
        },
        {
          assignmentId: 'a-2',
          branchDepartmentId: 'bd-other',
          templateName: 'Choir',
          serviceDate: '2026-05-25',
          startTime: '10:00',
          slotRoleName: 'Soprano',
          status: 'confirmed',
        },
      ],
      isLoading: false,
      isError: false,
    });

    render(<MyRotaTab branchDepartmentId="bd-1" />, { wrapper });

    expect(screen.getByText(/Sunday Ushers/i)).toBeInTheDocument();
    expect(screen.queryByText(/Choir/i)).not.toBeInTheDocument();
    expect(screen.getByText(/1 upcoming duty/i)).toBeInTheDocument();
  });

  it('renders the loading skeleton', () => {
    useMyRotaMock.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    const { container } = render(<MyRotaTab branchDepartmentId="bd-1" />, { wrapper });

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders an error message on isError', () => {
    useMyRotaMock.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    render(<MyRotaTab branchDepartmentId="bd-1" />, { wrapper });

    expect(screen.getByText(/Couldn't load your rota/i)).toBeInTheDocument();
  });
});

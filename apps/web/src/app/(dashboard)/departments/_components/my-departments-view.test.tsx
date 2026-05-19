import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const useMyDepartmentsMock = vi.fn();
const useMyRotaMock = vi.fn();
vi.mock('@/hooks/use-departments', () => ({
  useMyDepartments: () => useMyDepartmentsMock(),
}));
vi.mock('@/hooks/use-me', () => ({
  useMyRota: () => useMyRotaMock(),
}));

import { MyDepartmentsView } from './my-departments-view';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('MyDepartmentsView', () => {
  beforeEach(() => {
    useMyDepartmentsMock.mockReset();
    useMyRotaMock.mockReset();
  });

  it('renders the empty state when the user belongs to no departments', () => {
    useMyDepartmentsMock.mockReturnValue({ data: [], isLoading: false });
    useMyRotaMock.mockReturnValue({ data: [], isLoading: false });
    render(<MyDepartmentsView />, { wrapper });

    expect(screen.getByText(/You're not in any departments yet/i)).toBeInTheDocument();
  });

  it('renders a skeleton while departments load', () => {
    useMyDepartmentsMock.mockReturnValue({ data: undefined, isLoading: true });
    useMyRotaMock.mockReturnValue({ data: [], isLoading: true });
    const { container } = render(<MyDepartmentsView />, { wrapper });

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders one card per department, with inline upcoming rota preview', () => {
    useMyDepartmentsMock.mockReturnValue({
      data: [
        { id: 'bd-1', departmentName: 'Ushers', branchName: 'Main Branch' },
        { id: 'bd-2', departmentName: 'Worship', branchName: 'Main Branch' },
      ],
      isLoading: false,
    });
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
          branchDepartmentId: 'bd-1',
          templateName: 'Sunday Ushers',
          serviceDate: '2026-05-31',
          startTime: '09:00',
          slotRoleName: 'Door greeter',
          status: 'tentative',
        },
      ],
      isLoading: false,
    });

    render(<MyDepartmentsView />, { wrapper });

    expect(screen.getByText('Ushers')).toBeInTheDocument();
    expect(screen.getByText('Worship')).toBeInTheDocument();

    // Ushers card has 2 upcoming duties
    const ushersCard = screen.getByText('Ushers').closest('a')!;
    expect(within(ushersCard).getByText(/2 upcoming duties/i)).toBeInTheDocument();
    // Role names are rendered alongside the template name within a single <p>,
    // so use a regex matcher to find substrings rather than exact text content.
    expect(within(ushersCard).getByText(/Front of house/)).toBeInTheDocument();

    // Worship card has no upcoming duties
    const worshipCard = screen.getByText('Worship').closest('a')!;
    expect(within(worshipCard).getByText(/No upcoming duties/i)).toBeInTheDocument();
  });

  it('summarises the overflow when more than 3 duties exist', () => {
    useMyDepartmentsMock.mockReturnValue({
      data: [{ id: 'bd-1', departmentName: 'Ushers', branchName: 'Main' }],
      isLoading: false,
    });
    useMyRotaMock.mockReturnValue({
      data: Array.from({ length: 5 }, (_, i) => ({
        assignmentId: `a-${i}`,
        branchDepartmentId: 'bd-1',
        templateName: 'Sunday Ushers',
        serviceDate: `2026-06-0${i + 1}`,
        startTime: '09:00',
        slotRoleName: 'Front of house',
        status: 'confirmed',
      })),
      isLoading: false,
    });

    render(<MyDepartmentsView />, { wrapper });

    expect(screen.getByText(/5 upcoming duties/i)).toBeInTheDocument();
    expect(screen.getByText(/\+ 2 more/i)).toBeInTheDocument();
  });

  it('renders an "On probation" badge when probationByDeptId maps the department', () => {
    useMyDepartmentsMock.mockReturnValue({
      data: [
        { id: 'bd-1', departmentName: 'Host Team', branchName: 'Main Branch' },
        { id: 'bd-2', departmentName: 'Worship', branchName: 'Main Branch' },
      ],
      isLoading: false,
    });
    useMyRotaMock.mockReturnValue({ data: [], isLoading: false });

    const probationByDeptId = new Map([
      ['bd-1', { endDate: '2026-06-17' }],
    ]);
    render(<MyDepartmentsView probationByDeptId={probationByDeptId} />, { wrapper });

    const hostCard = screen.getByText('Host Team').closest('a')!;
    expect(within(hostCard).getByText(/On probation/i)).toBeInTheDocument();

    const worshipCard = screen.getByText('Worship').closest('a')!;
    expect(within(worshipCard).queryByText(/On probation/i)).toBeNull();
  });
});

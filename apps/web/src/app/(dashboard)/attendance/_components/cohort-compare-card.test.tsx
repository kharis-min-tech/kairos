import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const cohortMutate = vi.fn().mockResolvedValue({ members: [] });
let cohortData: { members: { memberId: string; firstName: string; lastName: string }[] } | undefined = undefined;
let cohortIsSuccess = false;
let cohortIsPending = false;

vi.mock('@/hooks/use-attendance', () => ({
  useServices: () => ({
    data: {
      data: [
        { id: 's-1', serviceDate: '2026-05-26T10:00:00.000Z', serviceType: 'Sunday', serviceTitle: null },
        { id: 's-2', serviceDate: '2026-06-02T10:00:00.000Z', serviceType: 'Sunday', serviceTitle: null },
      ],
      total: 2,
      page: 1,
      limit: 100,
    },
    isLoading: false,
    isError: false,
    error: null,
  }),
  useCohortDiff: () => ({
    data: cohortData,
    isSuccess: cohortIsSuccess,
    isError: false,
    isPending: cohortIsPending,
    error: null,
    mutateAsync: cohortMutate,
    reset: vi.fn(),
  }),
}));

import { CohortCompareCard } from './cohort-compare-card';

describe('CohortCompareCard', () => {
  it('disables the Run button when no services are picked', () => {
    cohortData = undefined;
    cohortIsSuccess = false;
    cohortMutate.mockClear();
    render(<CohortCompareCard />);
    const btn = screen.getByRole('button', { name: /Run comparison/i });
    expect(btn).toHaveProperty('disabled', true);
  });

  it('submits the picked services and respects the ANY/ALL toggle', async () => {
    cohortData = undefined;
    cohortIsSuccess = false;
    cohortMutate.mockClear();
    render(<CohortCompareCard branchId="b-1" />);
    // Pick service 1 in the "Present in" column
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]!); // first row in "Present in" column
    // Pick service 2 in the "Absent from" column (second column's second row)
    fireEvent.click(checkboxes[3]!);

    fireEvent.click(screen.getByRole('button', { name: /Run comparison/i }));

    await waitFor(() => expect(cohortMutate).toHaveBeenCalled());
    expect(cohortMutate.mock.calls[0]![0]).toMatchObject({
      branchId: 'b-1',
      presentMode: 'any',
      absentMode: 'all',
    });
    expect(cohortMutate.mock.calls[0]![0].presentInServiceIds).toEqual(['s-1']);
    expect(cohortMutate.mock.calls[0]![0].absentFromServiceIds).toEqual(['s-2']);
  });

  it('renders the result list when the mutation succeeds', () => {
    cohortData = { members: [{ memberId: 'm-1', firstName: 'Ada', lastName: 'Lovelace' }] };
    cohortIsSuccess = true;
    render(<CohortCompareCard />);
    expect(screen.getByText('Ada Lovelace')).toBeDefined();
    expect(screen.getByText(/1 member match/i)).toBeDefined();
  });

  it('shows the empty-state message when no members match', () => {
    cohortData = { members: [] };
    cohortIsSuccess = true;
    render(<CohortCompareCard />);
    expect(screen.getByText(/No members match this comparison/i)).toBeDefined();
  });
});

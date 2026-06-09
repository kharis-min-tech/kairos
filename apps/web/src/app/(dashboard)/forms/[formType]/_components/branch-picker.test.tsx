import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let user: { id: string; systemRole: string; homeBranchId: string } | null = {
  id: 'u-1',
  systemRole: 'admin',
  homeBranchId: 'b-1',
};

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector?: (s: { user: typeof user }) => unknown) =>
    selector ? selector({ user }) : { user },
}));

let branches: Array<{ id: string; branchName: string }> = [
  { id: 'b-1', branchName: 'London' },
  { id: 'b-2', branchName: 'Accra' },
];

vi.mock('@/hooks/use-branches', () => ({
  useBranches: () => ({ data: branches, isLoading: false }),
}));

import { BranchPicker } from './branch-picker';

describe('BranchPicker — persona visibility', () => {
  it('renders the picker for admin with every branch listed', () => {
    user = { id: 'u-1', systemRole: 'admin', homeBranchId: 'b-1' };
    branches = [
      { id: 'b-1', branchName: 'London' },
      { id: 'b-2', branchName: 'Accra' },
    ];
    render(<BranchPicker value={undefined} onChange={() => {}} />);
    expect(screen.getByText(/Capturing for branch/i)).toBeDefined();
  });

  it('renders nothing for a regular member', () => {
    user = { id: 'u-2', systemRole: 'member', homeBranchId: 'b-1' };
    const { container } = render(<BranchPicker value={undefined} onChange={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for a leader (non-admin/pastor)', () => {
    user = { id: 'u-3', systemRole: 'leader', homeBranchId: 'b-1' };
    const { container } = render(<BranchPicker value={undefined} onChange={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for a pastor with only one branch in their list (single-branch case collapses)', () => {
    user = { id: 'u-4', systemRole: 'pastor', homeBranchId: 'b-1' };
    branches = [
      { id: 'b-1', branchName: 'London' },
      { id: 'b-2', branchName: 'Accra' },
    ];
    // Pastor's visible list is filtered to home branch (single entry) → picker hides.
    const { container } = render(<BranchPicker value={undefined} onChange={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});

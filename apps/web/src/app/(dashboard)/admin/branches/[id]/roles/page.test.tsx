import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// ── Mocks (declared before importing the page) ─────────────

let authState: {
  activeRole: string | null;
  branchSystemAdminBranchIds: string[];
  branchDataAdminBranchIds: string[];
} = {
  activeRole: 'admin',
  branchSystemAdminBranchIds: [],
  branchDataAdminBranchIds: [],
};
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'b-1' }),
  useRouter: () => ({ push: vi.fn(), replace }),
}));

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: <T,>(selector?: (s: typeof authState) => T) =>
    selector ? selector(authState) : (authState as unknown as T),
}));

const mockBranch = { id: 'b-1', branchName: 'London', branchType: 'main' };

const mockRolesData = [
  {
    id: 'ra-1',
    memberId: 'm-1',
    member: { id: 'm-1', firstName: 'Sarah', lastName: 'Williams', email: 'sarah@kairos.local' },
    roleName: 'Branch System Admin',
    assignedDate: '2026-01-15',
    isActive: true,
  },
  {
    id: 'ra-2',
    memberId: 'm-2',
    member: { id: 'm-2', firstName: 'Marcus', lastName: 'Chen', email: 'marcus@kairos.local' },
    roleName: 'Branch System Admin',
    assignedDate: '2026-02-20',
    isActive: true,
  },
];

let rolesData: typeof mockRolesData | null = mockRolesData;

vi.mock('@/hooks/use-branches', () => ({
  useBranch: () => ({ data: mockBranch, isLoading: false }),
  useBranchRoles: (branchId: string) => ({
    data: branchId ? rolesData ?? [] : undefined,
    isLoading: false,
    error: null,
  }),
  useAssignBranchRole: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
  useRevokeBranchRole: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
}));

vi.mock('@/hooks/use-members', () => ({
  useMembers: () => ({ data: { data: [], meta: { total: 0 } }, isLoading: false }),
}));

import BranchRolesPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  replace.mockClear();
  rolesData = mockRolesData;
});

describe('BranchRolesPage — visibility guard', () => {
  it('allows system admin (no redirect, manage controls visible)', async () => {
    authState = {
      activeRole: 'admin',
      branchSystemAdminBranchIds: [],
      branchDataAdminBranchIds: [],
    };
    render(<BranchRolesPage />, { wrapper });
    await Promise.resolve();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /assign admin/i })).toBeInTheDocument();
  });

  it('allows BSA of this branch (no redirect, manage controls visible)', async () => {
    authState = {
      activeRole: 'leader',
      branchSystemAdminBranchIds: ['b-1'],
      branchDataAdminBranchIds: [],
    };
    render(<BranchRolesPage />, { wrapper });
    await Promise.resolve();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /assign admin/i })).toBeInTheDocument();
  });

  it('allows BDA of this branch but hides manage controls (read-only)', async () => {
    authState = {
      activeRole: 'leader',
      branchSystemAdminBranchIds: [],
      branchDataAdminBranchIds: ['b-1'],
    };
    render(<BranchRolesPage />, { wrapper });
    await Promise.resolve();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /assign admin/i })).not.toBeInTheDocument();
    // Revoke buttons should not appear either.
    expect(screen.queryByRole('button', { name: /revoke branch system admin/i })).not.toBeInTheDocument();
    // BDA gets an explanatory tooltip-style description.
    expect(screen.getByText(/requires branch system admin authority/i)).toBeInTheDocument();
  });

  it('redirects a plain member to /', async () => {
    authState = {
      activeRole: 'member',
      branchSystemAdminBranchIds: [],
      branchDataAdminBranchIds: [],
    };
    render(<BranchRolesPage />, { wrapper });
    await Promise.resolve();
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('redirects a BSA of a DIFFERENT branch', async () => {
    authState = {
      activeRole: 'leader',
      branchSystemAdminBranchIds: ['b-2'],
      branchDataAdminBranchIds: [],
    };
    render(<BranchRolesPage />, { wrapper });
    await Promise.resolve();
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('redirects a pastor without BSA on this branch', async () => {
    authState = {
      activeRole: 'pastor',
      branchSystemAdminBranchIds: [],
      branchDataAdminBranchIds: [],
    };
    render(<BranchRolesPage />, { wrapper });
    await Promise.resolve();
    expect(replace).toHaveBeenCalledWith('/');
  });
});

describe('BranchRolesPage — list rendering', () => {
  it('shows assignments with member name, email, and assigned date', () => {
    authState = {
      activeRole: 'admin',
      branchSystemAdminBranchIds: [],
      branchDataAdminBranchIds: [],
    };
    render(<BranchRolesPage />, { wrapper });
    expect(screen.getByText('Sarah Williams')).toBeInTheDocument();
    expect(screen.getByText('sarah@kairos.local')).toBeInTheDocument();
    expect(screen.getByText('Marcus Chen')).toBeInTheDocument();
  });

  it('shows an empty state when no admins are assigned', () => {
    authState = {
      activeRole: 'admin',
      branchSystemAdminBranchIds: [],
      branchDataAdminBranchIds: [],
    };
    rolesData = [];
    render(<BranchRolesPage />, { wrapper });
    expect(screen.getByText(/no branch system admins assigned yet/i)).toBeInTheDocument();
  });

  it('disables revoke on the only remaining BSA (last-BSA guard)', () => {
    authState = {
      activeRole: 'admin',
      branchSystemAdminBranchIds: [],
      branchDataAdminBranchIds: [],
    };
    rolesData = [mockRolesData[0]!];
    render(<BranchRolesPage />, { wrapper });
    const revokeBtn = screen.getByRole('button', { name: /revoke branch system admin from sarah williams/i });
    expect(revokeBtn).toBeDisabled();
    expect(revokeBtn).toHaveAttribute('title', expect.stringMatching(/cannot revoke the last/i));
  });

  it('enables revoke on each row when more than one BSA exists', () => {
    authState = {
      activeRole: 'admin',
      branchSystemAdminBranchIds: [],
      branchDataAdminBranchIds: [],
    };
    render(<BranchRolesPage />, { wrapper });
    const revokeSarah = screen.getByRole('button', { name: /revoke branch system admin from sarah williams/i });
    const revokeMarcus = screen.getByRole('button', { name: /revoke branch system admin from marcus chen/i });
    expect(revokeSarah).not.toBeDisabled();
    expect(revokeMarcus).not.toBeDisabled();
  });
});

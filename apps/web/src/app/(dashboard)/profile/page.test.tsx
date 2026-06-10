import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// ── Mutable mock state ─────────────────────────────────────
let authState: {
  user: { id: string; firstName: string; lastName: string; homeBranchId?: string; systemRole?: string } | null;
  setUser: (u: unknown) => void;
  setTokens: (t: unknown) => void;
} = {
  user: { id: 'me-1', firstName: 'Ada', lastName: 'Lovelace', homeBranchId: 'b-1', systemRole: 'member' },
  setUser: vi.fn(),
  setTokens: vi.fn(),
};

let memberProfile: {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  systemRole?: string;
  homeBranchId?: string;
  secondaryBranchId?: string | null;
} | null = {
  id: 'me-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  systemRole: 'member',
  homeBranchId: 'b-1',
  secondaryBranchId: null,
};
let memberLoading = false;

let fellowships: Array<{
  id: string;
  fellowshipName: string;
  fellowshipType?: string;
  leaderId?: string | null;
  coLeaderId?: string | null;
}> = [];
let myDepts: Array<{
  id: string;
  departmentName?: string;
  leadMemberId?: string | null;
  deputyMemberId?: string | null;
}> = [];
const branches = [
  { id: 'b-1', branchName: 'Brixton' },
  { id: 'b-2', branchName: 'Manchester' },
];

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: <T,>(selector?: (s: typeof authState) => T) =>
    selector ? selector(authState) : (authState as unknown as T),
}));

vi.mock('@/hooks/use-members', () => ({
  useMyProfile: () => ({ data: memberProfile, isLoading: memberLoading }),
  useUpdateMember: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSwitchActiveBranch: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/use-branches', () => ({
  useBranches: () => ({ data: branches, isLoading: false }),
}));

vi.mock('@/hooks/use-fellowships', () => ({
  useFellowships: () => ({ data: { data: fellowships } }),
}));

vi.mock('@/hooks/use-departments', () => ({
  useMyDepartments: () => ({ data: myDepts }),
}));

import ProfilePage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  authState = {
    user: { id: 'me-1', firstName: 'Ada', lastName: 'Lovelace', homeBranchId: 'b-1', systemRole: 'member' },
    setUser: vi.fn(),
    setTokens: vi.fn(),
  };
  memberProfile = {
    id: 'me-1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    systemRole: 'member',
    homeBranchId: 'b-1',
    secondaryBranchId: null,
  };
  memberLoading = false;
  fellowships = [];
  myDepts = [];
});

describe('ProfilePage', () => {
  it('renders the skeleton while the profile is loading', () => {
    memberLoading = true;
    memberProfile = null;
    const { container } = render(<ProfilePage />, { wrapper });
    // skeleton-only state shows no real heading
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
    expect(screen.queryByRole('heading', { name: /Ada Lovelace/ })).toBeNull();
  });

  it('survives the loading → loaded transition without a rules-of-hooks error', () => {
    // Phase 1: render while loading. If any hook was added after the early return,
    // re-rendering in phase 2 (when isLoading flips to false) would throw the
    // "change in the order of Hooks called" runtime error.
    memberLoading = true;
    memberProfile = null;
    const { rerender } = render(<ProfilePage />, { wrapper });

    // Phase 2: data arrives.
    memberLoading = false;
    memberProfile = {
      id: 'me-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      systemRole: 'member',
      homeBranchId: 'b-1',
      secondaryBranchId: null,
    };
    expect(() => rerender(<ProfilePage />)).not.toThrow();
    expect(screen.getByRole('heading', { name: /Ada Lovelace/ })).toBeDefined();
  });

  it('renders the friendly role line instead of raw systemRole for a plain member', () => {
    render(<ProfilePage />, { wrapper });
    // Raw "member" enum value must NOT appear as a label
    expect(screen.queryByText(/^member$/i)).toBeNull();
    expect(screen.queryByText(/System Role/i)).toBeNull();
    // Friendly line appears (member + home branch)
    expect(screen.getByText(/Member of Kharis Church — Brixton branch/i)).toBeDefined();
  });

  it('renders "Pastor of Brixton branch" for a pastor', () => {
    memberProfile!.systemRole = 'pastor';
    render(<ProfilePage />, { wrapper });
    expect(screen.getByText(/Pastor of Brixton branch/i)).toBeDefined();
  });

  it('renders "Church administrator" for admin', () => {
    memberProfile!.systemRole = 'admin';
    render(<ProfilePage />, { wrapper });
    // Appears as both the role line at the top AND inside the My leadership card.
    expect(screen.getAllByText(/Church administrator/i).length).toBeGreaterThan(0);
  });

  it('renders a fellowship-lead role line when the caller leads a fellowship', () => {
    memberProfile!.systemRole = 'leader';
    fellowships = [
      { id: 'f-1', fellowshipName: 'K-Group A', fellowshipType: 'k_group', leaderId: 'me-1' },
    ];
    render(<ProfilePage />, { wrapper });
    expect(screen.getByText(/Lead of K-Group A fellowship/i)).toBeDefined();
  });

  it('renders a department-deputy role line when the caller is a dept deputy', () => {
    memberProfile!.systemRole = 'leader';
    myDepts = [
      { id: 'd-1', departmentName: 'Worship', deputyMemberId: 'me-1' },
    ];
    render(<ProfilePage />, { wrapper });
    expect(screen.getByText(/Deputy of Worship department/i)).toBeDefined();
  });

  it('renders "Where I belong" with the home branch name always visible', () => {
    render(<ProfilePage />, { wrapper });
    expect(screen.getByText(/Where I belong/i)).toBeDefined();
    // Brixton appears in both the role line AND the Where I belong card.
    expect(screen.getAllByText(/Brixton/).length).toBeGreaterThan(0);
  });

  it('hides the My community card entirely when the user has no fellowships and no departments', () => {
    render(<ProfilePage />, { wrapper });
    expect(screen.queryByText(/My community/i)).toBeNull();
  });

  it('shows the My community card and lists fellowships when the user has at least one', () => {
    fellowships = [
      { id: 'f-1', fellowshipName: 'K-Group A', fellowshipType: 'k_group' },
    ];
    render(<ProfilePage />, { wrapper });
    expect(screen.getByText(/My community/i)).toBeDefined();
    expect(screen.getByText(/K-Group A/)).toBeDefined();
  });

  it('hides the My leadership card when the user has no leadership role', () => {
    render(<ProfilePage />, { wrapper });
    expect(screen.queryByText(/My leadership/i)).toBeNull();
  });

  it('shows the My leadership card when the user leads a department', () => {
    memberProfile!.systemRole = 'leader';
    myDepts = [
      { id: 'd-1', departmentName: 'Choir', leadMemberId: 'me-1' },
    ];
    render(<ProfilePage />, { wrapper });
    expect(screen.getByText(/My leadership/i)).toBeDefined();
    expect(screen.getByText(/Lead — Choir department/i)).toBeDefined();
  });
});

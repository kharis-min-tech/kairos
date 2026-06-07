import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// ── next/navigation ────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'member-1' }),
  useRouter: () => ({ push: vi.fn() }),
}));

// ── auth store: admin so canManage = true ──────────────────
let auth: { user: { id: string; systemRole: string }; activeRole: string } = {
  user: { id: 'admin-1', systemRole: 'admin' },
  activeRole: 'admin',
};
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector?: (s: typeof auth) => unknown) => (selector ? selector(auth) : auth),
}));

// ── hooks ──────────────────────────────────────────────────
let memberData: Record<string, unknown>;
let healthData: unknown;

vi.mock('@/hooks/use-members', () => ({
  useMember: () => ({ data: memberData, isLoading: false, error: null }),
  useMemberRoles: () => ({ data: [] }),
  useRemoveRole: () => ({ mutate: vi.fn() }),
  useDeactivateMember: () => ({ mutate: vi.fn() }),
  useReactivateMember: () => ({ mutate: vi.fn() }),
  useApproveMember: () => ({ mutate: vi.fn() }),
  useAssignRole: () => ({ mutate: vi.fn(), error: null, isPending: false }),
  useAllRoles: () => ({ data: [] }),
  useMemberHealthRecord: () => ({ data: healthData, isLoading: false, error: null }),
  useUpsertMemberHealthRecord: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

vi.mock('@/hooks/use-fellowships', () => ({
  useFellowships: () => ({ data: { data: [] }, isLoading: false }),
  useAddFellowshipMember: () => ({ mutate: vi.fn(), isPending: false, isSuccess: false, error: null }),
}));

vi.mock('@/hooks/use-branches', () => ({
  useBranches: () => ({ data: [] }),
}));

import MemberDetailPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const baseMember = {
  id: 'member-1',
  firstName: 'Tim',
  lastName: 'Minor',
  email: 'tim@example.com',
  phone: '0700',
  gender: 'Male',
  dateOfBirth: '2015-01-01',
  membershipDate: '2024-01-01',
  address: '1 Road',
  city: 'Town',
  postalCode: 'AB1',
  emergencyContactName: 'Mum',
  emergencyContactRelationship: 'Mother',
  emergencyContactPhone: '0711',
  homeBranchId: 'branch-1',
  isActive: true,
  approvalStatus: 'approved',
  systemRole: 'member',
};

const fullRecord = {
  id: 'hr-1',
  memberId: 'member-1',
  branchId: 'branch-1',
  medicalConditions: 'Asthma',
  allergies: 'Peanuts',
  medications: null,
  dietaryNeeds: null,
  additionalNotes: null,
  photoMediaConsent: true,
  medicalTreatmentConsent: false,
  dataProcessingConsent: null,
  consentRecordedBy: 'admin-1',
  consentDate: '2026-05-01',
  isActive: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  healthData = undefined;
  auth = { user: { id: 'admin-1', systemRole: 'admin' }, activeRole: 'admin' };
});

describe('MemberDetailPage — minor protection', () => {
  it('shows the minor badge when isMinor', () => {
    memberData = { ...baseMember, isMinor: true, redacted: false };
    healthData = fullRecord;
    render(<MemberDetailPage />, { wrapper });
    expect(screen.getByText(/minor — protected/i)).toBeInTheDocument();
  });

  it('does not show a minor badge or health section for a non-minor', () => {
    memberData = { ...baseMember, dateOfBirth: '1990-01-01', isMinor: false, redacted: false };
    render(<MemberDetailPage />, { wrapper });
    expect(screen.queryByText(/minor — protected/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/safeguarding & health/i)).not.toBeInTheDocument();
    // normal field values are shown
    expect(screen.getByText('tim@example.com')).toBeInTheDocument();
  });

  it('redacted view shows locked notices and no health values', () => {
    memberData = {
      ...baseMember,
      email: null,
      phone: null,
      dateOfBirth: null,
      address: null,
      city: null,
      postalCode: null,
      emergencyContactName: null,
      emergencyContactRelationship: null,
      emergencyContactPhone: null,
      isMinor: true,
      redacted: true,
    };
    render(<MemberDetailPage />, { wrapper });

    // Each of the 9 redacted fields (email, phone, DOB, address, city, postal
    // code, emergency name/relationship/phone) renders the locked notice with a
    // real em-dash — a literal "—" would not match this regex.
    expect(screen.getAllByText(/hidden — safeguarding protected/i).length).toBeGreaterThanOrEqual(9);
    expect(screen.getByText(/need safeguarding access/i)).toBeInTheDocument();
    // health values are NOT rendered
    expect(screen.queryByText('Asthma')).not.toBeInTheDocument();
    expect(screen.queryByText('Peanuts')).not.toBeInTheDocument();
    // gender (non-protected) still shows
    expect(screen.getByText('Male')).toBeInTheDocument();
  });

  it('full-access view renders the health section with values and consent states', () => {
    memberData = { ...baseMember, isMinor: true, redacted: false };
    healthData = fullRecord;
    render(<MemberDetailPage />, { wrapper });

    expect(screen.getByText(/safeguarding & health/i)).toBeInTheDocument();
    expect(screen.getByText('Asthma')).toBeInTheDocument();
    expect(screen.getByText('Peanuts')).toBeInTheDocument();
    // consent states
    expect(screen.getByText(/photo & media/i).closest('div')).toHaveTextContent(/granted/i);
    expect(screen.getByText(/medical treatment/i).closest('div')).toHaveTextContent(/declined/i);
    expect(screen.getByText(/data processing/i).closest('div')).toHaveTextContent(/not recorded/i);
  });
});

describe('MemberDetailPage — self-edit + fellowship request flow', () => {
  it('shows "Edit my profile" CTA when viewing own profile', () => {
    auth = { user: { id: 'member-1', systemRole: 'member' }, activeRole: 'member' };
    memberData = { ...baseMember, dateOfBirth: '1990-01-01' };
    render(<MemberDetailPage />, { wrapper });
    expect(screen.getByText(/Edit my profile/i)).toBeInTheDocument();
  });

  it('does NOT show "Edit my profile" CTA when viewing someone else', () => {
    auth = { user: { id: 'admin-1', systemRole: 'admin' }, activeRole: 'admin' };
    memberData = { ...baseMember, dateOfBirth: '1990-01-01' };
    render(<MemberDetailPage />, { wrapper });
    expect(screen.queryByText(/Edit my profile/i)).not.toBeInTheDocument();
  });

  it('member viewing own profile with no fellowship sees the join-request CTA', () => {
    auth = { user: { id: 'member-1', systemRole: 'member' }, activeRole: 'member' };
    memberData = { ...baseMember, dateOfBirth: '1990-01-01' };
    render(<MemberDetailPage />, { wrapper });
    // Unique CardDescription for the no-fellowship self case
    expect(screen.getByText(/You haven't joined a fellowship yet/i)).toBeInTheDocument();
    expect(screen.getByText(/send a join request/i)).toBeInTheDocument();
    // CardDescription for the manager assign case must NOT be present
    expect(screen.queryByText(/Assign this member to a fellowship/i)).toBeNull();
  });

  it('admin viewing a member with no fellowship sees the Assign control', () => {
    auth = { user: { id: 'admin-1', systemRole: 'admin' }, activeRole: 'admin' };
    memberData = { ...baseMember, dateOfBirth: '1990-01-01' };
    render(<MemberDetailPage />, { wrapper });
    expect(screen.getByText(/Assign this member to a fellowship/i)).toBeInTheDocument();
    expect(screen.queryByText(/send a join request/i)).toBeNull();
  });
});

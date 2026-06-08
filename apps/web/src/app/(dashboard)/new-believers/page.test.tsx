import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

let authState: {
  user: { id: string; systemRole: string; homeBranchId?: string } | null;
  activeRole: string | null;
} = {
  user: { id: 'admin-1', systemRole: 'admin', homeBranchId: 'b-1' },
  activeRole: 'admin',
};

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: <T,>(selector?: (s: typeof authState) => T) =>
    selector ? selector(authState) : (authState as unknown as T),
}));

let mockHats: {
  isNbLeader: boolean;
  hasTeacherRole: boolean;
  taughtEnrollmentIds: string[];
  mentoredEnrollmentIds: string[];
  ownEnrollmentIds: string[];
} = {
  isNbLeader: false,
  hasTeacherRole: false,
  taughtEnrollmentIds: [],
  mentoredEnrollmentIds: [],
  ownEnrollmentIds: [],
};

let mockEnrollments: Array<Record<string, unknown>> = [];

vi.mock('@/hooks/use-new-believers', () => ({
  useEnrollments: () => ({ data: { data: mockEnrollments, total: mockEnrollments.length }, isLoading: false }),
  useEnrollment: () => ({ data: undefined, isLoading: false }),
  useEnrollmentAlerts: () => ({ data: { data: [] } }),
  useCreateEnrollment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateEnrollment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useBulkAdvanceEnrollments: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useMyNewBelieverHats: () => ({ data: mockHats }),
  useMentorFollowups: () => ({ data: [] }),
  useCreateMentorFollowup: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/use-departments', () => ({
  useDepartments: () => ({ data: { data: [] } }),
}));

vi.mock('@/hooks/use-members', () => ({
  useMembers: () => ({ data: { data: [] } }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import NewBelieversPage from './page';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('NewBelieversPage — persona surface', () => {
  it('admin sees the Enrol Member CTA and Kanban pipeline header', () => {
    authState = { user: { id: 'admin-1', systemRole: 'admin', homeBranchId: 'b-1' }, activeRole: 'admin' };
    mockHats = { isNbLeader: false, hasTeacherRole: false, taughtEnrollmentIds: [], mentoredEnrollmentIds: [], ownEnrollmentIds: [] };
    render(<NewBelieversPage />, { wrapper });
    expect(screen.getByText(/Enrol Member/i)).toBeDefined();
    expect(screen.getByText(/Journey tracking from enrolment/i)).toBeDefined();
  });

  it('pastor sees the Enrol Member CTA', () => {
    authState = { user: { id: 'p-1', systemRole: 'pastor', homeBranchId: 'b-1' }, activeRole: 'pastor' };
    mockHats = { isNbLeader: false, hasTeacherRole: false, taughtEnrollmentIds: [], mentoredEnrollmentIds: [], ownEnrollmentIds: [] };
    render(<NewBelieversPage />, { wrapper });
    expect(screen.getByText(/Enrol Member/i)).toBeDefined();
  });

  it('NB-dept leader (a non-admin/pastor) sees the Kanban (operator mode), NOT the Enrol CTA', () => {
    authState = { user: { id: 'l-1', systemRole: 'member', homeBranchId: 'b-1' }, activeRole: 'leader' };
    mockHats = { isNbLeader: true, hasTeacherRole: false, taughtEnrollmentIds: [], mentoredEnrollmentIds: [], ownEnrollmentIds: [] };
    render(<NewBelieversPage />, { wrapper });
    expect(screen.queryByText(/Enrol Member/i)).toBeNull();
    expect(screen.getByText(/Journey tracking from enrolment/i)).toBeDefined();
  });

  it('non-NB leader without any hats sees the empty personal state, NOT the Kanban', () => {
    authState = { user: { id: 'l-2', systemRole: 'member', homeBranchId: 'b-1' }, activeRole: 'leader' };
    mockHats = { isNbLeader: false, hasTeacherRole: false, taughtEnrollmentIds: [], mentoredEnrollmentIds: [], ownEnrollmentIds: [] };
    render(<NewBelieversPage />, { wrapper });
    expect(screen.getByText(/Your personal view of the New Believers programme/i)).toBeDefined();
    expect(screen.queryByText(/Journey tracking from enrolment/i)).toBeNull();
    expect(screen.getByText(/You are not currently enrolled/i)).toBeDefined();
  });

  it('member with no hats sees the personal-mode empty state', () => {
    authState = { user: { id: 'm-1', systemRole: 'member', homeBranchId: 'b-1' }, activeRole: 'member' };
    mockHats = { isNbLeader: false, hasTeacherRole: false, taughtEnrollmentIds: [], mentoredEnrollmentIds: [], ownEnrollmentIds: [] };
    mockEnrollments = [];
    render(<NewBelieversPage />, { wrapper });
    expect(screen.getByText(/Your personal view of the New Believers programme/i)).toBeDefined();
    expect(screen.queryByText(/Journey tracking from enrolment/i)).toBeNull();
    expect(screen.queryByText(/Enrol Member/i)).toBeNull();
  });

  it('member who teaches AND mentors gets both tabs (and no enrollment tab)', () => {
    authState = { user: { id: 'm-2', systemRole: 'member', homeBranchId: 'b-1' }, activeRole: 'member' };
    mockHats = {
      isNbLeader: false,
      hasTeacherRole: false,
      taughtEnrollmentIds: ['e-taught'],
      mentoredEnrollmentIds: ['e-mentored'],
      ownEnrollmentIds: [],
    };
    mockEnrollments = [
      { id: 'e-taught', memberId: 'other-1', teacherId: 'm-2', mentorId: null, stage: 'session-1', memberFirstName: 'Tee', memberLastName: 'Student', enrolledAt: '2026-05-01', updatedAt: '2026-06-01' },
      { id: 'e-mentored', memberId: 'other-2', teacherId: null, mentorId: 'm-2', stage: 'session-2', memberFirstName: 'Em', memberLastName: 'Mentee', enrolledAt: '2026-05-02', updatedAt: '2026-06-02' },
    ];
    render(<NewBelieversPage />, { wrapper });
    // Tab labels include counts
    expect(screen.getByRole('tab', { name: /My Teaching \(1\)/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /My Mentees \(1\)/i })).toBeDefined();
    expect(screen.queryByRole('tab', { name: /My Enrollment/i })).toBeNull();
  });
});

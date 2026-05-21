import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NewBelieverEnrollmentWithMember, NewBelieverHealthSummary } from '@kairos/types';

// ── Hook mock ─────────────────────────────────────────────
// recharts ResponsiveContainer needs a real width/height; mock it out for jsdom.
import type * as Recharts from 'recharts';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof Recharts>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: 600, height: 200 }}>
        {children}
      </div>
    ),
  };
});

const useHealthMock = vi.fn();
const useAlertsMock = vi.fn();

vi.mock('@/hooks/use-new-believers', () => ({
  useNewBelieversHealth: (branchId?: string) => useHealthMock(branchId),
  useEnrollmentAlerts: () => useAlertsMock(),
}));

import { ProgramHealthStrip } from './program-health-strip';

function happyHealth(): NewBelieverHealthSummary {
  return {
    attendanceTrend: [
      {
        sessionId: 's1',
        sessionDate: '2026-05-15T10:00:00.000Z',
        sessionStage: 'session-1',
        topic: 'Foundations of Faith',
        attended: 8,
        eligible: 10,
        attendanceRate: 0.8,
      },
      {
        sessionId: 's2',
        sessionDate: '2026-05-08T10:00:00.000Z',
        sessionStage: 'session-2',
        topic: 'Who is a Christian',
        attended: 5,
        eligible: 10,
        attendanceRate: 0.5,
      },
    ],
    stageFunnel: {
      enrolled: 0,
      'session-1': 3,
      'session-2': 2,
      'session-3': 0,
      'session-4': 0,
      completed: 0,
      integrated: 1,
    },
    stale: { count: 2, thresholdDays: 7 },
    summary: { avgAttendanceRate: 0.65, activeEnrollments: 6 },
  };
}

function emptyHealth(): NewBelieverHealthSummary {
  return {
    attendanceTrend: [],
    stageFunnel: {
      enrolled: 0,
      'session-1': 0,
      'session-2': 0,
      'session-3': 0,
      'session-4': 0,
      completed: 0,
      integrated: 0,
    },
    stale: { count: 0, thresholdDays: 7 },
    summary: { avgAttendanceRate: null, activeEnrollments: 0 },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useAlertsMock.mockReturnValue({ data: { data: [], total: 0, page: 1, limit: 100 } });
});

describe('ProgramHealthStrip', () => {
  it('shows the loading skeleton while the query is fetching', () => {
    useHealthMock.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<ProgramHealthStrip branchId="branch-1" />);
    // Three skeleton tiles render with animate-pulse
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(3);
  });

  it('renders nothing when there are no sessions AND no active enrollments', () => {
    useHealthMock.mockReturnValue({ data: emptyHealth(), isLoading: false });
    const { container } = render(<ProgramHealthStrip branchId="branch-1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the default three tiles in the happy-path state', () => {
    useHealthMock.mockReturnValue({ data: happyHealth(), isLoading: false });
    const { container } = render(<ProgramHealthStrip branchId="branch-1" />);

    // Tile headlines: attendance avg (65%), active enrollments (6), stale (2)
    expect(screen.getByText(/65%/)).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/7\+ days no progress/i)).toBeInTheDocument();
    // Stale-tile deep link
    expect(screen.getByRole('link', { name: /stale/i })).toHaveAttribute(
      'href',
      '/new-believers?filter=stale',
    );
    // Expand button
    expect(screen.getByRole('button', { name: /expand/i })).toBeInTheDocument();
    expect(container.querySelector('.bg-white')).toBeNull();
    expect(container.querySelectorAll('.bg-card').length).toBeGreaterThanOrEqual(2);
  });

  it('toggles to expanded mode and back when the Expand / Collapse button is clicked', async () => {
    const user = userEvent.setup();
    useHealthMock.mockReturnValue({ data: happyHealth(), isLoading: false });
    useAlertsMock.mockReturnValue({
      data: {
        data: [
          {
            id: 'e1',
            memberId: 'm1',
            branchId: 'branch-1',
            stage: 'session-1',
            enrolledAt: '2026-04-01T00:00:00.000Z',
            updatedAt: '2026-04-25T00:00:00.000Z',
            createdAt: '2026-04-01T00:00:00.000Z',
            isActive: true,
            memberFirstName: 'Jane',
            memberLastName: 'Doe',
          } as NewBelieverEnrollmentWithMember,
        ],
        total: 1,
        page: 1,
        limit: 100,
      },
    });

    const { container } = render(<ProgramHealthStrip branchId="branch-1" />);

    await user.click(screen.getByRole('button', { name: /expand/i }));

    // The expanded section reveals the stale-list preview header and Jane Doe.
    expect(screen.getByText(/jane doe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /collapse/i })).toBeInTheDocument();
    expect(container.querySelector('.bg-white')).toBeNull();

    await user.click(screen.getByRole('button', { name: /collapse/i }));
    expect(screen.getByRole('button', { name: /expand/i })).toBeInTheDocument();
  });

  it('switches stale tile to red when count reaches the RAG threshold', () => {
    useHealthMock.mockReturnValue({
      data: {
        ...happyHealth(),
        stale: { count: 5, thresholdDays: 7 },
      },
      isLoading: false,
    });
    const { container } = render(<ProgramHealthStrip branchId="branch-1" />);
    // The stale tile uses the red surface when count >= 5.
    expect(container.querySelector('[data-stale-rag="red"]')).not.toBeNull();
  });
});

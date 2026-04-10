import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('id=1'),
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { sub: 'u1', email: 'pastor@test.com', role: 'Pastor', branchId: '1' }, isAuthenticated: true, isLoading: false }),
}));

// Mock API client
const mockGetProgram = vi.fn();

vi.mock('@kairos/api-client', () => ({
  outreach: {
    getProgram: (...args: unknown[]) => mockGetProgram(...args),
  },
}));

import OutreachProgramDetailPage from './program-detail';

const MOCK_PROGRAM = {
  outreachId: 1,
  branchId: 1,
  programName: 'Easter Outreach',
  programDate: '2025-04-12',
  location: 'City Park',
  address: '123 Main St',
  city: 'Lagos',
  description: 'Easter evangelism event',
  totalSoulsReached: 15,
  notes: null,
  isCompleted: false,
  coordinator: { memberId: 10, firstName: 'John', lastName: 'Doe' },
  participants: [
    { memberId: 10, firstName: 'John', lastName: 'Doe', role: 'Leader', notes: null, createdAt: '2025-01-01' },
    { memberId: 11, firstName: 'Jane', lastName: 'Smith', role: null, notes: null, createdAt: '2025-01-02' },
  ],
  souls: [
    {
      soulId: 1,
      firstName: 'Grace',
      lastName: 'Obi',
      phone: '08012345678',
      email: 'grace@test.com',
      status: 'Following Up',
      assignedWorker: { memberId: 10, firstName: 'John', lastName: 'Doe' },
      followUpCount: 3,
      lastFollowUpDate: '2025-04-15',
      followUpOutcomes: { Successful: 2, 'No Answer': 1 },
      createdAt: '2025-04-12',
      updatedAt: '2025-04-15',
    },
    {
      soulId: 2,
      firstName: 'David',
      lastName: 'Eze',
      phone: null,
      email: null,
      status: 'Converted',
      assignedWorker: { memberId: 11, firstName: 'Jane', lastName: 'Smith' },
      followUpCount: 5,
      lastFollowUpDate: '2025-04-20',
      followUpOutcomes: { Successful: 3, Interested: 2 },
      createdAt: '2025-04-12',
      updatedAt: '2025-04-20',
    },
  ],
  createdAt: '2025-01-01',
  updatedAt: '2025-04-20',
};

const MOCK_EMPTY_PROGRAM = {
  ...MOCK_PROGRAM,
  participants: [],
  souls: [],
  totalSoulsReached: 0,
  description: null,
};

const waitForLoaded = () =>
  waitFor(() => {
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

describe('OutreachProgramDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProgram.mockResolvedValue(MOCK_PROGRAM);
  });

  afterEach(() => {
    cleanup();
  });

  it('shows loading spinner while fetching data', () => {
    mockGetProgram.mockReturnValue(new Promise(() => {}));
    render(<OutreachProgramDetailPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows error alert when API call fails', async () => {
    mockGetProgram.mockRejectedValue(new Error('Network error'));
    render(<OutreachProgramDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load program details.')).toBeInTheDocument();
    });
  });

  it('calls getProgram with the correct ID from search params', async () => {
    render(<OutreachProgramDetailPage />);
    await waitForLoaded();
    expect(mockGetProgram).toHaveBeenCalledWith(1);
  });

  it('renders program name in heading and active status badge', async () => {
    render(<OutreachProgramDetailPage />);
    await waitForLoaded();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Easter Outreach');
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders completed status badge for completed programs', async () => {
    mockGetProgram.mockResolvedValue({ ...MOCK_PROGRAM, isCompleted: true });
    render(<OutreachProgramDetailPage />);
    await waitForLoaded();

    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders program date, location with city, and coordinator', async () => {
    render(<OutreachProgramDetailPage />);
    await waitForLoaded();

    expect(screen.getByText(/City Park, Lagos/)).toBeInTheDocument();
    const johnDoeElements = screen.getAllByText(/John Doe/);
    expect(johnDoeElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders stat cards with correct values', async () => {
    render(<OutreachProgramDetailPage />);
    await waitForLoaded();

    expect(screen.getByText('Attendees')).toBeInTheDocument();
    expect(screen.getByText('Souls Won')).toBeInTheDocument();
    expect(screen.getByText('Follow-ups')).toBeInTheDocument();

    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders participants list with names and roles', async () => {
    render(<OutreachProgramDetailPage />);
    await waitForLoaded();

    expect(screen.getByText('Participants (2)')).toBeInTheDocument();
    const johnDoeElements = screen.getAllByText('John Doe');
    expect(johnDoeElements.length).toBeGreaterThanOrEqual(1);
    const janeSmithElements = screen.getAllByText('Jane Smith');
    expect(janeSmithElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Leader')).toBeInTheDocument();
  });

  it('renders souls captured table with status badges', async () => {
    render(<OutreachProgramDetailPage />);
    await waitForLoaded();

    expect(screen.getByText('Souls Captured (2)')).toBeInTheDocument();
    expect(screen.getByText('Grace Obi')).toBeInTheDocument();
    expect(screen.getByText('David Eze')).toBeInTheDocument();
    expect(screen.getByText('Following Up')).toBeInTheDocument();
    expect(screen.getByText('Converted')).toBeInTheDocument();
  });

  it('renders follow-up outcomes summary with aggregated counts', async () => {
    render(<OutreachProgramDetailPage />);
    await waitForLoaded();

    expect(screen.getByText('Follow-up Outcomes Summary')).toBeInTheDocument();
    expect(screen.getByText('Successful')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('No Answer')).toBeInTheDocument();
    expect(screen.getByText('Interested')).toBeInTheDocument();
  });

  it('shows empty state for participants when none exist', async () => {
    mockGetProgram.mockResolvedValue(MOCK_EMPTY_PROGRAM);
    render(<OutreachProgramDetailPage />);
    await waitForLoaded();

    expect(screen.getByText('No participants registered.')).toBeInTheDocument();
  });

  it('shows empty state for souls when none captured', async () => {
    mockGetProgram.mockResolvedValue(MOCK_EMPTY_PROGRAM);
    render(<OutreachProgramDetailPage />);
    await waitForLoaded();

    expect(screen.getByText('No souls captured yet.')).toBeInTheDocument();
  });

  it('does not render follow-up outcomes summary when no outcomes exist', async () => {
    mockGetProgram.mockResolvedValue(MOCK_EMPTY_PROGRAM);
    render(<OutreachProgramDetailPage />);
    await waitForLoaded();

    expect(screen.queryByText('Follow-up Outcomes Summary')).not.toBeInTheDocument();
  });

  it('navigates back when back button is clicked', async () => {
    const user = userEvent.setup();
    render(<OutreachProgramDetailPage />);
    await waitForLoaded();

    await user.click(screen.getByLabelText('Back to programs'));
    expect(mockPush).toHaveBeenCalledWith('/evangelism/outreach');
  });

  it('renders breadcrumbs with program name', async () => {
    render(<OutreachProgramDetailPage />);
    await waitForLoaded();

    expect(screen.getByText('Outreach Programs')).toBeInTheDocument();
    expect(screen.getByText('Evangelism')).toBeInTheDocument();
    const programNameElements = screen.getAllByText('Easter Outreach');
    expect(programNameElements.length).toBe(2);
  });

  it('renders program description when present', async () => {
    render(<OutreachProgramDetailPage />);
    await waitForLoaded();

    expect(screen.getByText('Easter evangelism event')).toBeInTheDocument();
  });
});

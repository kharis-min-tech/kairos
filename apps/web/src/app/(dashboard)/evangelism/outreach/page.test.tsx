import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

// Mock auth
const mockUser = { sub: 'u1', email: 'pastor@test.com', role: 'Pastor', branchId: '1' };
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: mockUser, isAuthenticated: true, isLoading: false }),
}));

// Mock API client
const mockListPrograms = vi.fn();
const mockCompleteProgram = vi.fn();
const mockRegisterWorker = vi.fn();
const mockCreateProgram = vi.fn();
const mockOverrideBranch = vi.fn();

vi.mock('@kairos/api-client', () => ({
  outreach: {
    listPrograms: (...args: unknown[]) => mockListPrograms(...args),
    completeProgram: (...args: unknown[]) => mockCompleteProgram(...args),
    registerWorker: (...args: unknown[]) => mockRegisterWorker(...args),
    createProgram: (...args: unknown[]) => mockCreateProgram(...args),
    overrideBranch: (...args: unknown[]) => mockOverrideBranch(...args),
  },
}));

import OutreachProgramsPage from './page';

const MOCK_PROGRAMS = {
  data: [
    {
      outreachId: 1,
      branchId: 1,
      programName: 'Easter Outreach',
      programDate: '2025-04-12',
      location: 'City Park',
      description: 'Easter evangelism event',
      totalSoulsReached: 15,
      isCompleted: false,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    },
    {
      outreachId: 2,
      branchId: 1,
      programName: 'Summer Campaign',
      programDate: '2025-07-01',
      location: 'Town Square',
      description: null,
      totalSoulsReached: 8,
      isCompleted: true,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    },
    {
      outreachId: 3,
      branchId: 1,
      programName: 'Street Evangelism',
      programDate: '2025-09-15',
      location: 'High Street',
      description: null,
      totalSoulsReached: 0,
      isCompleted: false,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    },
  ],
  pagination: { page: 1, limit: 100, total: 3, totalPages: 1 },
};

describe('OutreachProgramsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPrograms.mockResolvedValue(MOCK_PROGRAMS);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders stat cards with correct values', async () => {
    render(<OutreachProgramsPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Programs')).toBeInTheDocument();
    });

    expect(screen.getByText('Active Programs')).toBeInTheDocument();
    expect(screen.getByText('Total Souls Won')).toBeInTheDocument();

    // Total Programs = 3
    expect(screen.getByText('3')).toBeInTheDocument();
    // Active Programs = 2 (programs 1 and 3 are not completed)
    expect(screen.getByText('2')).toBeInTheDocument();
    // Total Souls Won = 15 + 8 + 0 = 23
    expect(screen.getByText('23')).toBeInTheDocument();
  });

  it('renders program cards with name, date, location, and status badge', async () => {
    render(<OutreachProgramsPage />);

    await waitFor(() => {
      expect(screen.getByText('Easter Outreach')).toBeInTheDocument();
    });

    expect(screen.getByText('Summer Campaign')).toBeInTheDocument();
    expect(screen.getByText('Street Evangelism')).toBeInTheDocument();

    // Status badges
    const activeBadges = screen.getAllByText('Active');
    expect(activeBadges).toHaveLength(2);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('shows loading spinner while fetching data', () => {
    mockListPrograms.mockReturnValue(new Promise(() => {})); // never resolves
    render(<OutreachProgramsPage />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows empty state when no programs exist', async () => {
    mockListPrograms.mockResolvedValue({ data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } });
    render(<OutreachProgramsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no outreach programs yet/i)).toBeInTheDocument();
    });
  });

  it('navigates to detail page when a program card is clicked', async () => {
    const user = userEvent.setup();
    render(<OutreachProgramsPage />);

    await waitFor(() => {
      expect(screen.getByText('Easter Outreach')).toBeInTheDocument();
    });

    // Click on the card (the card itself, not a button inside it)
    await user.click(screen.getByText('Easter Outreach'));

    expect(mockPush).toHaveBeenCalledWith('/evangelism/outreach/detail?id=1');
  });

  it('shows Complete button for pastors on active programs', async () => {
    render(<OutreachProgramsPage />);

    await waitFor(() => {
      expect(screen.getByText('Easter Outreach')).toBeInTheDocument();
    });

    // Active programs should have Complete buttons (pastor role)
    const completeButtons = screen.getAllByText('Complete');
    expect(completeButtons).toHaveLength(2); // programs 1 and 3 are active
  });

  it('calls completeProgram API when Complete button is clicked', async () => {
    mockCompleteProgram.mockResolvedValue({});
    const user = userEvent.setup();
    render(<OutreachProgramsPage />);

    await waitFor(() => {
      expect(screen.getByText('Easter Outreach')).toBeInTheDocument();
    });

    const completeButtons = screen.getAllByText('Complete');
    await user.click(completeButtons[0]);

    expect(mockCompleteProgram).toHaveBeenCalledWith(1);
    await waitFor(() => {
      expect(screen.getByText('Program marked as completed.')).toBeInTheDocument();
    });
  });

  it('does not show Complete button for completed programs', async () => {
    render(<OutreachProgramsPage />);

    await waitFor(() => {
      expect(screen.getByText('Summer Campaign')).toBeInTheDocument();
    });

    // The completed program card should not have Register or Complete buttons
    const summerCard = screen.getByText('Summer Campaign').closest('[class*="bg-white"]');
    expect(summerCard).toBeTruthy();
    // Completed program should not have action buttons
    expect(summerCard?.querySelector('button')).toBeNull();
  });

  it('does not show Complete button for regular members', async () => {
    mockUser.role = 'Member';
    render(<OutreachProgramsPage />);

    await waitFor(() => {
      expect(screen.getByText('Easter Outreach')).toBeInTheDocument();
    });

    expect(screen.queryByText('Complete')).not.toBeInTheDocument();

    // Restore
    mockUser.role = 'Pastor';
  });

  it('displays souls won count on each program card', async () => {
    render(<OutreachProgramsPage />);

    await waitFor(() => {
      expect(screen.getByText('Easter Outreach')).toBeInTheDocument();
    });

    // Souls counts: 15, 8, 0
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('opens Create Program modal when button is clicked', async () => {
    const user = userEvent.setup();
    render(<OutreachProgramsPage />);

    await waitFor(() => {
      expect(screen.getByText('Easter Outreach')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Create Program'));

    // Modal should show form fields
    await waitFor(() => {
      expect(screen.getByText('Create Outreach Program')).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/program name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
  });

  it('shows Register as Worker button on active program cards', async () => {
    render(<OutreachProgramsPage />);

    await waitFor(() => {
      expect(screen.getByText('Easter Outreach')).toBeInTheDocument();
    });

    // 2 active programs should have Register as Worker buttons
    const registerButtons = screen.getAllByText('Register as Worker');
    expect(registerButtons).toHaveLength(2);
  });

  it('calls registerWorker API when Register as Worker is clicked', async () => {
    mockRegisterWorker.mockResolvedValue({});
    const user = userEvent.setup();
    render(<OutreachProgramsPage />);

    await waitFor(() => {
      expect(screen.getByText('Easter Outreach')).toBeInTheDocument();
    });

    const registerButtons = screen.getAllByText('Register as Worker');
    await user.click(registerButtons[0]);

    expect(mockRegisterWorker).toHaveBeenCalledWith(1, { memberId: 0 });
    await waitFor(() => {
      expect(screen.getByText('Registered as worker successfully!')).toBeInTheDocument();
    });
  });

  it('does not show Register as Worker on completed programs', async () => {
    render(<OutreachProgramsPage />);

    await waitFor(() => {
      expect(screen.getByText('Summer Campaign')).toBeInTheDocument();
    });

    // Only 2 register buttons (for the 2 active programs), not 3
    const registerButtons = screen.getAllByText('Register as Worker');
    expect(registerButtons).toHaveLength(2);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { sub: 'u1', email: 'pastor@test.com', role: 'Pastor', branchId: '1' }, isAuthenticated: true, isLoading: false }),
}));

// Mock API client
const mockGetFollowUpTracker = vi.fn();
const mockAddFollowup = vi.fn();

vi.mock('@kairos/api-client', () => ({
  souls: {
    getFollowUpTracker: (...args: unknown[]) => mockGetFollowUpTracker(...args),
    addFollowup: (...args: unknown[]) => mockAddFollowup(...args),
  },
}));

import FollowUpTrackerPage from './page';

const MOCK_ITEMS = [
  {
    followUpId: 1,
    soulId: 10,
    soulName: 'Grace Obi',
    assignedWorker: 'John Doe',
    dueDate: '2099-12-31',
    contactMethod: 'Phone Call',
    contactStatus: 'Pending',
    status: 'Pending' as const,
    notes: null,
    createdAt: '2025-01-01',
  },
  {
    followUpId: 2,
    soulId: 11,
    soulName: 'David Eze',
    assignedWorker: 'Jane Smith',
    dueDate: '2020-01-01', // past date → overdue
    contactMethod: 'Email',
    contactStatus: 'Pending',
    status: 'Pending' as const,
    notes: null,
    createdAt: '2025-01-01',
  },
  {
    followUpId: 3,
    soulId: 12,
    soulName: 'Mary Johnson',
    assignedWorker: 'John Doe',
    dueDate: null,
    contactMethod: 'Text Message',
    contactStatus: 'Completed',
    status: 'Completed' as const,
    notes: 'Good conversation',
    createdAt: '2025-01-01',
  },
];

const MOCK_RESPONSE = {
  pending: 5,
  completed: 12,
  items: MOCK_ITEMS,
};

/** Helper: wait for the page to finish loading */
const waitForLoaded = () =>
  waitFor(() => {
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Follow-Up Tracker');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

describe('FollowUpTrackerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFollowUpTracker.mockResolvedValue(MOCK_RESPONSE);
  });

  afterEach(() => {
    cleanup();
  });

  // --- Requirement 19.1: Stat cards ---
  it('renders stat cards with correct values', async () => {
    render(<FollowUpTrackerPage />);
    await waitForLoaded();

    expect(screen.getByText('Pending Follow-Ups Due This Week')).toBeInTheDocument();
    expect(screen.getByText('Completed Follow-Ups This Month')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  // --- Loading state ---
  it('shows loading spinner while fetching data', () => {
    mockGetFollowUpTracker.mockReturnValue(new Promise(() => {})); // never resolves
    render(<FollowUpTrackerPage />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  // --- Requirement 19.2: Follow-up cards ---
  it('renders follow-up cards with soul name, worker, due date, method, and status', async () => {
    render(<FollowUpTrackerPage />);
    await waitForLoaded();

    expect(screen.getByText('Grace Obi')).toBeInTheDocument();
    expect(screen.getByText('David Eze')).toBeInTheDocument();
    expect(screen.getByText('Mary Johnson')).toBeInTheDocument();

    // Assigned workers
    const johnDoeElements = screen.getAllByText('John Doe');
    expect(johnDoeElements.length).toBeGreaterThanOrEqual(1);
    const janeSmithElements = screen.getAllByText('Jane Smith');
    expect(janeSmithElements.length).toBeGreaterThanOrEqual(1);

    // Contact methods are displayed on cards
    expect(screen.getAllByText('Phone Call').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Email').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Text Message').length).toBeGreaterThanOrEqual(1);
  });

  // --- Requirement 19.3: Tab switching ---
  it('renders tabs for All, Pending, and Overdue', async () => {
    render(<FollowUpTrackerPage />);
    await waitForLoaded();

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveTextContent('All');
    expect(tabs[1]).toHaveTextContent('Pending');
    expect(tabs[2]).toHaveTextContent('Overdue');
  });

  it('filters to pending items when Pending tab is clicked', async () => {
    const user = userEvent.setup();
    render(<FollowUpTrackerPage />);
    await waitForLoaded();

    await user.click(screen.getByRole('tab', { name: 'Pending' }));

    // Grace Obi is pending (future due date), David Eze is overdue (past due date), Mary is completed
    expect(screen.getByText('Grace Obi')).toBeInTheDocument();
    expect(screen.queryByText('David Eze')).not.toBeInTheDocument();
    expect(screen.queryByText('Mary Johnson')).not.toBeInTheDocument();
  });

  it('filters to overdue items when Overdue tab is clicked', async () => {
    const user = userEvent.setup();
    render(<FollowUpTrackerPage />);
    await waitForLoaded();

    await user.click(screen.getByRole('tab', { name: 'Overdue' }));

    // David Eze has past due date → overdue
    expect(screen.getByText('David Eze')).toBeInTheDocument();
    expect(screen.queryByText('Grace Obi')).not.toBeInTheDocument();
    expect(screen.queryByText('Mary Johnson')).not.toBeInTheDocument();
  });

  // --- Requirement 19.4: Search ---
  it('filters by soul name when searching', async () => {
    const user = userEvent.setup();
    render(<FollowUpTrackerPage />);
    await waitForLoaded();

    const searchInput = screen.getByLabelText('Search follow-ups');
    await user.type(searchInput, 'Grace');

    expect(screen.getByText('Grace Obi')).toBeInTheDocument();
    expect(screen.queryByText('David Eze')).not.toBeInTheDocument();
    expect(screen.queryByText('Mary Johnson')).not.toBeInTheDocument();
  });

  it('filters by worker name when searching', async () => {
    const user = userEvent.setup();
    render(<FollowUpTrackerPage />);
    await waitForLoaded();

    const searchInput = screen.getByLabelText('Search follow-ups');
    await user.type(searchInput, 'Jane');

    // Jane Smith is assigned to David Eze
    expect(screen.getByText('David Eze')).toBeInTheDocument();
    expect(screen.queryByText('Grace Obi')).not.toBeInTheDocument();
    expect(screen.queryByText('Mary Johnson')).not.toBeInTheDocument();
  });

  // --- Requirement 19.5: Filter controls ---
  it('filters by status dropdown', async () => {
    const user = userEvent.setup();
    render(<FollowUpTrackerPage />);
    await waitForLoaded();

    // Select "Completed" status filter
    await user.selectOptions(screen.getByDisplayValue('All Statuses'), 'Completed');

    expect(screen.getByText('Mary Johnson')).toBeInTheDocument();
    expect(screen.queryByText('Grace Obi')).not.toBeInTheDocument();
  });

  it('filters by contact method dropdown', async () => {
    const user = userEvent.setup();
    render(<FollowUpTrackerPage />);
    await waitForLoaded();

    // Select "Email" contact method filter
    await user.selectOptions(screen.getByDisplayValue('All Methods'), 'Email');

    expect(screen.getByText('David Eze')).toBeInTheDocument();
    expect(screen.queryByText('Grace Obi')).not.toBeInTheDocument();
    expect(screen.queryByText('Mary Johnson')).not.toBeInTheDocument();
  });

  // --- Requirement 19.7: Overdue highlighting ---
  it('highlights overdue cards with amber border and warning icon', async () => {
    render(<FollowUpTrackerPage />);
    await waitForLoaded();

    // David Eze's card should have amber border (overdue)
    const davidCard = screen.getByText('David Eze').closest('.rounded-lg');
    expect(davidCard).toBeTruthy();
    expect(davidCard?.className).toContain('border-amber');

    // Should have AlertTriangle icon with title "Overdue"
    expect(davidCard?.querySelector('[title="Overdue"]')).toBeTruthy();
  });

  it('does not highlight non-overdue cards with amber border', async () => {
    render(<FollowUpTrackerPage />);
    await waitForLoaded();

    const graceCard = screen.getByText('Grace Obi').closest('.rounded-lg');
    expect(graceCard).toBeTruthy();
    expect(graceCard?.className).not.toContain('border-amber');
  });

  // --- Requirement 19.6: Log Follow-Up modal ---
  it('opens Log Follow-Up modal when button is clicked', async () => {
    const user = userEvent.setup();
    render(<FollowUpTrackerPage />);
    await waitForLoaded();

    const logButtons = screen.getAllByText('Log Follow-Up');
    await user.click(logButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Log Follow-Up — Grace Obi/)).toBeInTheDocument();
    });

    // Modal should have form fields
    expect(screen.getByLabelText(/Contact Method/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact Status/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Duration/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Next Follow-Up Date/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Notes/)).toBeInTheDocument();
  });

  it('validates required fields in Log Follow-Up modal', async () => {
    const user = userEvent.setup();
    render(<FollowUpTrackerPage />);
    await waitForLoaded();

    const logButtons = screen.getAllByText('Log Follow-Up');
    await user.click(logButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Log Follow-Up — Grace Obi/)).toBeInTheDocument();
    });

    // Submit without filling required fields
    const submitButtons = screen.getAllByRole('button', { name: /Log Follow-Up/i });
    const modalSubmit = submitButtons.find(btn => btn.getAttribute('type') === 'submit');
    await user.click(modalSubmit!);

    await waitFor(() => {
      expect(screen.getByText('Contact method is required')).toBeInTheDocument();
      expect(screen.getByText('Contact status is required')).toBeInTheDocument();
    });

    expect(mockAddFollowup).not.toHaveBeenCalled();
  });

  it('submits follow-up successfully and shows success message', async () => {
    mockAddFollowup.mockResolvedValue({});
    const user = userEvent.setup();
    render(<FollowUpTrackerPage />);
    await waitForLoaded();

    const logButtons = screen.getAllByText('Log Follow-Up');
    await user.click(logButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Log Follow-Up — Grace Obi/)).toBeInTheDocument();
    });

    // Fill required fields
    await user.selectOptions(screen.getByLabelText(/Contact Method/), 'Phone Call');
    await user.selectOptions(screen.getByLabelText(/Contact Status/), 'Successful');

    // Submit
    const submitButtons = screen.getAllByRole('button', { name: /Log Follow-Up/i });
    const modalSubmit = submitButtons.find(btn => btn.getAttribute('type') === 'submit');
    await user.click(modalSubmit!);

    await waitFor(() => {
      expect(mockAddFollowup).toHaveBeenCalledWith(10, expect.objectContaining({
        contact_method: 'Phone Call',
        contact_status: 'Successful',
      }));
    });

    await waitFor(() => {
      expect(screen.getByText('Follow-up logged successfully!')).toBeInTheDocument();
    });
  });

  // --- Empty state ---
  it('shows empty state when no follow-ups found', async () => {
    mockGetFollowUpTracker.mockResolvedValue({ pending: 0, completed: 0, items: [] });
    render(<FollowUpTrackerPage />);
    await waitForLoaded();

    expect(screen.getByText('No follow-ups found.')).toBeInTheDocument();
  });

  // --- Error handling ---
  it('shows error alert when API call fails', async () => {
    mockGetFollowUpTracker.mockRejectedValue(new Error('Network error'));
    render(<FollowUpTrackerPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load follow-up data.')).toBeInTheDocument();
    });
  });
});

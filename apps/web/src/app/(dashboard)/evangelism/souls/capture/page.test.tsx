import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { sub: 'u1', email: 'worker@test.com', role: 'Member', branchId: '1' }, isAuthenticated: true, isLoading: false }),
}));

// Mock API client
const mockCreate = vi.fn();
const mockListPrograms = vi.fn();

vi.mock('@kairos/api-client', () => ({
  souls: {
    create: (...args: unknown[]) => mockCreate(...args),
  },
  outreach: {
    listPrograms: (...args: unknown[]) => mockListPrograms(...args),
  },
}));

import SoulCapturePage from './page';

const MOCK_PROGRAMS = {
  data: [
    { outreach_id: 1, program_name: 'Easter Outreach' },
    { outreach_id: 2, program_name: 'Summer Campaign' },
  ],
  pagination: { page: 1, limit: 100, total: 2, totalPages: 1 },
};

describe('SoulCapturePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPrograms.mockResolvedValue(MOCK_PROGRAMS);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all form fields', async () => {
    render(<SoulCapturePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^phone$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gender/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/age group/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/source/i)).toBeInTheDocument();
  });

  it('defaults source selector to Ad-hoc Evangelism', async () => {
    render(<SoulCapturePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/source/i)).toBeInTheDocument();
    });

    const sourceSelect = screen.getByLabelText(/source/i) as HTMLSelectElement;
    expect(sourceSelect.value).toBe('ad-hoc');
  });

  it('does not show outreach program dropdown when source is ad-hoc', async () => {
    render(<SoulCapturePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/source/i)).toBeInTheDocument();
    });

    expect(screen.queryByLabelText(/outreach program/i)).not.toBeInTheDocument();
  });

  it('shows outreach program dropdown when source is switched to Outreach Program', async () => {
    const user = userEvent.setup();
    render(<SoulCapturePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/source/i)).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText(/source/i), 'outreach');

    await waitFor(() => {
      expect(screen.getByLabelText(/outreach program/i)).toBeInTheDocument();
    });
  });

  it('validates required fields and shows inline errors on empty submit', async () => {
    const user = userEvent.setup();
    render(<SoulCapturePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /capture soul/i }));

    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
      expect(screen.getByText('Last name is required')).toBeInTheDocument();
    });

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('validates outreach program is required when source is outreach', async () => {
    const user = userEvent.setup();
    render(<SoulCapturePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/source/i)).toBeInTheDocument();
    });

    // Fill required name fields
    await user.type(screen.getByLabelText(/first name/i), 'Grace');
    await user.type(screen.getByLabelText(/last name/i), 'Obi');

    // Switch to outreach source but don't select a program
    await user.selectOptions(screen.getByLabelText(/source/i), 'outreach');
    await user.click(screen.getByRole('button', { name: /capture soul/i }));

    await waitFor(() => {
      expect(screen.getByText('Select an outreach program')).toBeInTheDocument();
    });

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('shows success message and resets form on successful submission', async () => {
    mockCreate.mockResolvedValue({ soul_id: 1 });
    const user = userEvent.setup();
    render(<SoulCapturePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/first name/i), 'Grace');
    await user.type(screen.getByLabelText(/last name/i), 'Obi');
    await user.click(screen.getByRole('button', { name: /capture soul/i }));

    await waitFor(() => {
      expect(screen.getByText('Soul captured successfully!')).toBeInTheDocument();
    });

    // Form should be reset
    expect((screen.getByLabelText(/first name/i) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/last name/i) as HTMLInputElement).value).toBe('');
  });

  it('displays duplicate phone warning from API response', async () => {
    mockCreate.mockResolvedValue({ soul_id: 1, warning: 'A soul with phone 08012345678 already exists in this outreach.' });
    const user = userEvent.setup();
    render(<SoulCapturePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/first name/i), 'Grace');
    await user.type(screen.getByLabelText(/last name/i), 'Obi');
    await user.type(screen.getByLabelText(/^phone$/i), '08012345678');
    await user.click(screen.getByRole('button', { name: /capture soul/i }));

    await waitFor(() => {
      expect(screen.getByText('Soul captured with warning')).toBeInTheDocument();
      expect(screen.getByText(/A soul with phone 08012345678 already exists/)).toBeInTheDocument();
    });
  });

  it('displays error message when API call fails', async () => {
    mockCreate.mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();
    render(<SoulCapturePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/first name/i), 'Grace');
    await user.type(screen.getByLabelText(/last name/i), 'Obi');
    await user.click(screen.getByRole('button', { name: /capture soul/i }));

    await waitFor(() => {
      expect(screen.getByText('Failed to capture soul. Please try again.')).toBeInTheDocument();
    });
  });

  it('clears inline error when user starts typing in the field', async () => {
    const user = userEvent.setup();
    render(<SoulCapturePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    });

    // Trigger validation errors
    await user.click(screen.getByRole('button', { name: /capture soul/i }));
    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
    });

    // Start typing in first name — error should clear
    await user.type(screen.getByLabelText(/first name/i), 'G');
    expect(screen.queryByText('First name is required')).not.toBeInTheDocument();
  });
});

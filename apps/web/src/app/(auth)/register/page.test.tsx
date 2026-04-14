import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock API client
const mockCreate = vi.fn();
const mockBranchesList = vi.fn();

vi.mock('@kairos/api-client', () => ({
  members: { create: (...args: unknown[]) => mockCreate(...args) },
  branches: { list: (...args: unknown[]) => mockBranchesList(...args) },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, body: { code: string; message: string }) {
      super(body.message);
      this.status = status;
    }
  },
}));

import RegisterPage from './page';

const MOCK_BRANCHES = {
  data: [
    { id: '1', branchName: 'London Main', isActive: true },
    { id: '2', branchName: 'Manchester Branch', isActive: true },
  ],
  pagination: { page: 1, limit: 100, total: 2, totalPages: 1 },
};

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBranchesList.mockResolvedValue(MOCK_BRANCHES);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the registration form with all required fields', async () => {
    render(<RegisterPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gender/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/home branch/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  it('loads branches into the dropdown', async () => {
    render(<RegisterPage />);

    await waitFor(() => {
      expect(screen.getByText('London Main')).toBeInTheDocument();
    });
    expect(screen.getByText('Manchester Branch')).toBeInTheDocument();
    expect(mockBranchesList).toHaveBeenCalledWith({ limit: 100, isActive: true });
  });

  it('shows validation errors for empty required fields', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
    });
    expect(screen.getByText('Last name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Phone number is required')).toBeInTheDocument();
    expect(screen.getByText('Date of birth is required')).toBeInTheDocument();
    expect(screen.getByText('Gender is required')).toBeInTheDocument();
    expect(screen.getByText('Address is required')).toBeInTheDocument();
    expect(screen.getByText('Please select a home branch')).toBeInTheDocument();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('validates phone format', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/phone/i), 'abc');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid phone number')).toBeInTheDocument();
    });
  });

  it('submits the form and shows pending approval message', async () => {
    mockCreate.mockResolvedValue({ memberId: 1, firstName: 'John' });
    const user = userEvent.setup();
    render(<RegisterPage />);

    await waitFor(() => {
      expect(screen.getByText('London Main')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone/i), '+44 7700 900000');
    await user.type(screen.getByLabelText(/date of birth/i), '1990-01-15');
    await user.selectOptions(screen.getByLabelText(/gender/i), 'Male');
    await user.type(screen.getByLabelText(/address/i), '123 Church Lane');
    await user.selectOptions(screen.getByLabelText(/home branch/i), '1');

    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/pending approval/i)).toBeInTheDocument();
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+44 7700 900000',
        gender: 'Male',
        address: '123 Church Lane',
        homeBranchId: '1',
      }),
    );
  });

  it('shows error message when API call fails', async () => {
    const { ApiError } = await import('@kairos/api-client');
    mockCreate.mockRejectedValue(new ApiError(409, { code: 'DUPLICATE', message: 'Email already registered' }));
    const user = userEvent.setup();
    render(<RegisterPage />);

    await waitFor(() => {
      expect(screen.getByText('London Main')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone/i), '+44 7700 900000');
    await user.type(screen.getByLabelText(/date of birth/i), '1990-01-15');
    await user.selectOptions(screen.getByLabelText(/gender/i), 'Male');
    await user.type(screen.getByLabelText(/address/i), '123 Church Lane');
    await user.selectOptions(screen.getByLabelText(/home branch/i), '1');

    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText('Email already registered')).toBeInTheDocument();
    });
  });

  it('has a link to the login page', async () => {
    render(<RegisterPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
    });

    const signInLink = screen.getByRole('link', { name: /sign in/i });
    expect(signInLink).toHaveAttribute('href', '/login');
  });

  it('clears field error when user starts typing', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
    });

    // Submit empty to trigger errors
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
    });

    // Start typing in first name
    await user.type(screen.getByLabelText(/first name/i), 'J');

    expect(screen.queryByText('First name is required')).not.toBeInTheDocument();
  });
});

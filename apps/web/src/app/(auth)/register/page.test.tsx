import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Polyfill pointer capture methods for jsdom (Radix Select needs them)
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}

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
const mockRegister = vi.fn();
const mockBranchesList = vi.fn();

vi.mock('@kairos/api-client', () => ({
  auth: { register: (...args: unknown[]) => mockRegister(...args) },
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
    { branchId: 1, branchName: 'London Main', isActive: true },
    { branchId: 2, branchName: 'Manchester Branch', isActive: true },
  ],
  pagination: { page: 1, limit: 100, total: 2, totalPages: 1 },
};

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

/** Fill Step 0 (Personal Info) with valid data and advance */
async function fillPersonalStep(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/first name/i), 'John');
  await user.type(screen.getByLabelText(/last name/i), 'Doe');
  await user.type(screen.getByLabelText(/email/i), 'john@example.com');
  await user.type(screen.getByLabelText(/phone/i), '+44 7700 900000');
  await user.type(screen.getByLabelText(/date of birth/i), '1990-01-15');
  // Gender uses button-based selection
  await user.click(screen.getByRole('button', { name: 'Male' }));
  // Click Next to advance to Step 1
  await user.click(screen.getByRole('button', { name: /next/i }));
}

/** Fill Step 1 (Branch) with valid data and advance */
async function fillBranchStep(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/address/i), '123 Church Lane');
  // Radix Select — click trigger then select item from portaled content
  const trigger = screen.getByRole('combobox');
  await user.click(trigger);
  // Radix Select renders both native <option> and portaled <span>, use role="option"
  await waitFor(() => {
    expect(screen.getByRole('option', { name: 'London Main' })).toBeInTheDocument();
  });
  await user.click(screen.getByRole('option', { name: 'London Main' }));
  // Click Next to advance to Step 2
  await user.click(screen.getByRole('button', { name: /next/i }));
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBranchesList.mockResolvedValue(MOCK_BRANCHES);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders step 1 (personal info) with required fields', async () => {
    render(<RegisterPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
    // Gender uses buttons, not a labeled input
    expect(screen.getByRole('button', { name: 'Male' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Female' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('shows step 2 with branches after personal step', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    });

    await fillPersonalStep(user);

    // Should now be on Step 2 (Branch)
    await waitFor(() => {
      expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows validation errors on step 1 for empty required fields', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
    });
    expect(screen.getByText('Last name is required')).toBeInTheDocument();
    expect(screen.getByText('Date of birth is required')).toBeInTheDocument();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    // Use a value that passes HTML5 type="email" validation but fails Zod .email()
    await user.type(screen.getByLabelText(/email/i), 'bad@');
    
    // Submit via fireEvent to bypass HTML5 constraint validation that userEvent respects
    const form = screen.getByRole('form', { name: /personal/i });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
    });
  });

  it('validates phone format', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    });

    // Use a value that doesn't match the phone regex pattern
    await user.type(screen.getByLabelText(/phone/i), 'abc');
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid phone number')).toBeInTheDocument();
    });
  });

  it('submits full wizard and shows pending approval message', async () => {
    mockRegister.mockResolvedValue({ memberId: 1, firstName: 'John' });
    const user = userEvent.setup();
    render(<RegisterPage />, { wrapper: createWrapper() });

    // Step 0: Personal Info
    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    });
    await fillPersonalStep(user);

    // Step 1: Branch
    await waitFor(() => {
      expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
    });
    await fillBranchStep(user);

    // Step 2: Password
    await waitFor(() => {
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass1');
    await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass1');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    // Should show success
    await waitFor(() => {
      expect(screen.getByText(/pending approval/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Registration Submitted')).toBeInTheDocument();

    expect(mockRegister).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+44 7700 900000',
        gender: 'Male',
        address: '123 Church Lane',
        homeBranchId: 1,
        password: 'StrongPass1',
      }),
    );
  });

  it('shows error message when API call fails', async () => {
    const { ApiError } = await import('@kairos/api-client');
    mockRegister.mockRejectedValue(new ApiError(409, { code: 'DUPLICATE', message: 'Email already registered' }));
    const user = userEvent.setup();
    render(<RegisterPage />, { wrapper: createWrapper() });

    // Step 0
    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    });
    await fillPersonalStep(user);

    // Step 1
    await waitFor(() => {
      expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
    });
    await fillBranchStep(user);

    // Step 2
    await waitFor(() => {
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass1');
    await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass1');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Email already registered')).toBeInTheDocument();
    });
  });

  it('has a link to the login page', async () => {
    render(<RegisterPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    const signInLink = screen.getByRole('link', { name: /sign in/i });
    expect(signInLink).toHaveAttribute('href', '/login');
  });

  it('clears field error when user starts typing', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    // Submit empty to trigger errors
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
    });

    // Start typing in first name
    await user.type(screen.getByLabelText(/first name/i), 'J');

    await waitFor(() => {
      expect(screen.queryByText('First name is required')).not.toBeInTheDocument();
    });
  });
});

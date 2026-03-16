import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock Cognito functions
const mockForgotPassword = vi.fn();
const mockConfirmPassword = vi.fn();

vi.mock('@/lib/auth/cognito', () => ({
  forgotPassword: (...args: unknown[]) => mockForgotPassword(...args),
  confirmPassword: (...args: unknown[]) => mockConfirmPassword(...args),
}));

import ForgotPasswordPage from './page';

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the email step initially', () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByText('Reset Password')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send verification code/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to sign in/i })).toHaveAttribute('href', '/login');
  });

  it('validates empty email', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    await user.click(screen.getByRole('button', { name: /send verification code/i }));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
    });
    expect(mockForgotPassword).not.toHaveBeenCalled();
  });

  it('validates invalid email format', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    // Use fireEvent.submit to bypass HTML5 type="email" constraint validation
    const form = screen.getByRole('form', { name: /request password reset/i });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
    });
    expect(mockForgotPassword).not.toHaveBeenCalled();
  });

  it('calls forgotPassword and moves to confirm step on success', async () => {
    mockForgotPassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send verification code/i }));

    await waitFor(() => {
      expect(screen.getByText('Enter Code')).toBeInTheDocument();
    });
    expect(mockForgotPassword).toHaveBeenCalledWith('test@example.com');
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('shows error when forgotPassword fails', async () => {
    mockForgotPassword.mockRejectedValue(new Error('User not found'));
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), 'bad@example.com');
    await user.click(screen.getByRole('button', { name: /send verification code/i }));

    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument();
    });
  });

  it('validates empty code on confirm step', async () => {
    mockForgotPassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    // Move to confirm step
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send verification code/i }));
    await waitFor(() => {
      expect(screen.getByText('Enter Code')).toBeInTheDocument();
    });

    // Submit without filling in code or password
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText('Enter the 6-digit verification code')).toBeInTheDocument();
    });
    expect(mockConfirmPassword).not.toHaveBeenCalled();
  });

  it('validates password requirements', async () => {
    mockForgotPassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    // Move to confirm step
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send verification code/i }));
    await waitFor(() => {
      expect(screen.getByText('Enter Code')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/verification code/i), '123456');
    await user.type(screen.getByLabelText(/new password/i), 'short');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      const errorEl = document.querySelector('p.text-destructive');
      expect(errorEl).not.toBeNull();
      expect(errorEl!.textContent).toBe('At least 8 characters');
    });
    expect(mockConfirmPassword).not.toHaveBeenCalled();
  });

  it('successfully resets password and shows success message', async () => {
    mockForgotPassword.mockResolvedValue(undefined);
    mockConfirmPassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    // Step 1: email
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send verification code/i }));
    await waitFor(() => {
      expect(screen.getByText('Enter Code')).toBeInTheDocument();
    });

    // Step 2: code + password
    await user.type(screen.getByLabelText(/verification code/i), '123456');
    await user.type(screen.getByLabelText(/new password/i), 'NewPass1x');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText('Password Reset')).toBeInTheDocument();
    });
    expect(mockConfirmPassword).toHaveBeenCalledWith('test@example.com', '123456', 'NewPass1x');
    expect(screen.getByRole('link', { name: /back to sign in/i })).toHaveAttribute('href', '/login');
  });

  it('shows error when confirmPassword fails', async () => {
    mockForgotPassword.mockResolvedValue(undefined);
    mockConfirmPassword.mockRejectedValue(new Error('Invalid code'));
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    // Move to confirm step
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send verification code/i }));
    await waitFor(() => {
      expect(screen.getByText('Enter Code')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/verification code/i), '000000');
    await user.type(screen.getByLabelText(/new password/i), 'NewPass1x');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid code')).toBeInTheDocument();
    });
  });

  it('allows going back to email step from confirm step', async () => {
    mockForgotPassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    // Move to confirm step
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send verification code/i }));
    await waitFor(() => {
      expect(screen.getByText('Enter Code')).toBeInTheDocument();
    });

    // Go back
    await user.click(screen.getByText(/use a different email/i));

    expect(screen.getByText('Reset Password')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('shows password strength indicators', async () => {
    mockForgotPassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    // Move to confirm step
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send verification code/i }));
    await waitFor(() => {
      expect(screen.getByText('Enter Code')).toBeInTheDocument();
    });

    // Check password rules are displayed
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/one uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/one lowercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/one number/i)).toBeInTheDocument();
  });
});

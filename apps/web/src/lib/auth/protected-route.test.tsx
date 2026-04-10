import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProtectedRoute } from './protected-route';

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

// We'll control auth state via this mock
const mockAuthState = {
  user: null as { sub: string; email: string; role: string; branchId: string } | null,
  isAuthenticated: false,
  isLoading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
  getToken: vi.fn(),
};

vi.mock('./auth-context', () => ({
  useAuth: () => mockAuthState,
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.user = null;
    mockAuthState.isAuthenticated = false;
    mockAuthState.isLoading = false;
  });

  it('shows loading spinner while auth is loading', () => {
    mockAuthState.isLoading = true;

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', async () => {
    mockAuthState.isLoading = false;
    mockAuthState.isAuthenticated = false;

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    mockAuthState.isLoading = false;
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = { sub: 'u1', email: 'a@b.com', role: 'Admin', branchId: 'b1' };

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects to /unauthorized when role is not allowed', async () => {
    mockAuthState.isLoading = false;
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = { sub: 'u1', email: 'a@b.com', role: 'Member', branchId: 'b1' };

    render(
      <ProtectedRoute allowedRoles={['Admin', 'Pastor']}>
        <div>Admin Content</div>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/unauthorized');
    });
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('renders children when user role is in allowedRoles', () => {
    mockAuthState.isLoading = false;
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = { sub: 'u1', email: 'a@b.com', role: 'Pastor', branchId: 'b1' };

    render(
      <ProtectedRoute allowedRoles={['Admin', 'Pastor']}>
        <div>Pastor Content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Pastor Content')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

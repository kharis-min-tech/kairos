import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './auth-context';

// Mock the cognito module
vi.mock('./cognito', () => {
  const mockSession = {
    getIdToken: () => ({
      getJwtToken: () => 'mock-id-token',
      decodePayload: () => ({
        sub: 'user-123',
        email: 'admin@kairos.church',
        'custom:role': 'Admin',
        'custom:branchId': 'branch-1',
      }),
    }),
    getRefreshToken: () => ({ getToken: () => 'mock-refresh-token' }),
    isValid: () => true,
  };

  return {
    signIn: vi.fn().mockResolvedValue({
      user: { sub: 'user-123', email: 'admin@kairos.church', role: 'Admin', branchId: 'branch-1' },
      session: mockSession,
    }),
    signOut: vi.fn().mockResolvedValue(undefined),
    getCurrentSession: vi.fn().mockResolvedValue(null),
    getIdToken: vi.fn().mockResolvedValue('mock-id-token'),
    refreshSession: vi.fn().mockResolvedValue(mockSession),
    extractUser: vi.fn().mockReturnValue({
      sub: 'user-123',
      email: 'admin@kairos.church',
      role: 'Admin',
      branchId: 'branch-1',
    }),
  };
});

function TestConsumer() {
  const { user, isAuthenticated, isLoading, signIn, signOut, getToken } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <span data-testid="role">{user ? user.role : 'none'}</span>
      <button onClick={() => signIn('admin@kairos.church', 'password')}>Sign In</button>
      <button onClick={() => signOut()}>Sign Out</button>
      <button onClick={async () => {
        const token = await getToken();
        document.getElementById('token')!.textContent = token || 'null';
      }}>Get Token</button>
      <span id="token" data-testid="token"></span>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('starts in loading state then resolves to unauthenticated', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    // Should eventually resolve to not loading, not authenticated
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('signs in and updates state with user info', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      await user.click(screen.getByText('Sign In'));
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user').textContent).toBe('admin@kairos.church');
    expect(screen.getByTestId('role').textContent).toBe('Admin');
  });

  it('signs out and clears state', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // Sign in first
    await act(async () => {
      await user.click(screen.getByText('Sign In'));
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('true');

    // Sign out
    await act(async () => {
      await user.click(screen.getByText('Sign Out'));
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('provides getToken that returns the id token', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      await user.click(screen.getByText('Get Token'));
    });

    expect(screen.getByTestId('token').textContent).toBe('mock-id-token');
  });

  it('restores session from existing Cognito session on mount', async () => {
    const { getCurrentSession, extractUser } = await import('./cognito');
    const mockGetCurrentSession = getCurrentSession as ReturnType<typeof vi.fn>;
    const mockExtractUser = extractUser as ReturnType<typeof vi.fn>;

    const mockSession = {
      getIdToken: () => ({
        getJwtToken: () => 'existing-token',
        decodePayload: () => ({
          sub: 'user-456',
          email: 'pastor@kairos.church',
          'custom:role': 'Pastor',
          'custom:branchId': 'branch-2',
        }),
      }),
      getRefreshToken: () => ({ getToken: () => 'refresh-token' }),
      isValid: () => true,
    };

    mockGetCurrentSession.mockResolvedValueOnce(mockSession);
    mockExtractUser.mockReturnValueOnce({
      sub: 'user-456',
      email: 'pastor@kairos.church',
      role: 'Pastor',
      branchId: 'branch-2',
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user').textContent).toBe('pastor@kairos.church');
    expect(screen.getByTestId('role').textContent).toBe('Pastor');
  });
});

describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function BadConsumer() {
      useAuth();
      return null;
    }

    expect(() => render(<BadConsumer />)).toThrow('useAuth must be used within an AuthProvider');
    spy.mockRestore();
  });
});

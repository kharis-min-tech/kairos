/**
 * Preservation Tests — Members Module Bugs
 *
 * These tests capture BASELINE behavior that must remain unchanged after fixes.
 * They are EXPECTED TO PASS on unfixed code — passing confirms the baseline is correct.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { linkRenderSpy, membersListMock } = vi.hoisted(() => ({
  linkRenderSpy: vi.fn(),
  membersListMock: vi.fn().mockResolvedValue({
    data: [{ isActive: true }],
    pagination: { total: 1 },
  }),
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth/cognito', () => ({
  getCurrentSession: vi.fn().mockResolvedValue(null),
  signIn: vi.fn(),
  signOut: vi.fn(),
  getIdToken: vi.fn().mockResolvedValue(null),
  refreshSession: vi.fn().mockResolvedValue(null),
  extractUser: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => {
    linkRenderSpy(href);
    return <a href={href} data-nextjs-link="true" {...props}>{children as React.ReactNode}</a>;
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
  useRouter: vi.fn(() => ({ replace: vi.fn(), push: vi.fn() })),
}));

vi.mock('@kairos/api-client', () => ({
  members: {
    list: membersListMock,
    getPhotoUploadUrl: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  useAuth: vi.fn(() => ({
    user: { sub: 'u1', email: 'admin@kairos.church', role: 'Admin', branchId: '1' },
    isAuthenticated: true,
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    getToken: vi.fn(),
  })),
}));

// ProtectedRoute imports useAuth from './auth-context' (relative path)
vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: vi.fn(() => ({
    user: { sub: 'u1', email: 'admin@kairos.church', role: 'Admin', branchId: '1' },
    isAuthenticated: true,
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    getToken: vi.fn(),
  })),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { Sidebar } from '@/components/layout/sidebar';
import { PhotoUpload } from '@/app/(dashboard)/members/view/photo-upload';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { useAuth as useAuthContext } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  membersListMock.mockResolvedValue({
    data: [{ isActive: true }],
    pagination: { total: 1 },
  });
  vi.mocked(useAuthContext).mockReturnValue({
    user: { sub: 'u1', email: 'admin@kairos.church', role: 'Admin', branchId: '1' },
    isAuthenticated: true,
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    getToken: vi.fn(),
  });
});

// ─── Preservation 1: Sidebar navigation uses Next.js Link ────────────────────

describe('Preservation 1 — Sidebar navigation links use Next.js routing', () => {
  /**
   * Validates: Requirements 3.3, 3.4
   * Sidebar uses Next.js <Link> for all nav items — this must remain unchanged
   * after the TopBar fix (which only touches topbar.tsx).
   */

  it('sidebar nav links render with data-nextjs-link="true" (Next.js Link used)', async () => {
    await act(async () => {
      render(
        <Sidebar
          collapsed={false}
          onToggle={() => {}}
          currentPath="/dashboard"
          isPendingMember={false}
        />
      );
    });

    // All sidebar nav links should be rendered via Next.js Link
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).not.toBeNull();
    expect(dashboardLink.getAttribute('data-nextjs-link')).toBe('true');
  });

  it('sidebar Members link uses Next.js Link (href=/members)', async () => {
    await act(async () => {
      render(
        <Sidebar
          collapsed={false}
          onToggle={() => {}}
          currentPath="/dashboard"
          isPendingMember={false}
        />
      );
    });

    const membersLink = screen.getByRole('link', { name: /members/i });
    expect(membersLink).not.toBeNull();
    expect(membersLink.getAttribute('href')).toBe('/members');
    expect(membersLink.getAttribute('data-nextjs-link')).toBe('true');
  });

  it('linkRenderSpy is called for sidebar nav hrefs', async () => {
    await act(async () => {
      render(
        <Sidebar
          collapsed={false}
          onToggle={() => {}}
          currentPath="/dashboard"
          isPendingMember={false}
        />
      );
    });

    // Sidebar uses Next.js Link — linkRenderSpy should be called for nav items
    expect(linkRenderSpy).toHaveBeenCalledWith('/dashboard');
    expect(linkRenderSpy).toHaveBeenCalledWith('/members');
  });
});

// ─── Preservation 2: PhotoUpload displays existing photoUrl on initial load ───

describe('Preservation 2 — PhotoUpload displays existing photoUrl on initial load', () => {
  /**
   * Validates: Requirements 3.1
   * When photoUrl prop is provided and no upload has occurred,
   * the image must be displayed correctly.
   */

  it('renders <img> with the provided photoUrl when no upload has occurred', () => {
    render(
      <PhotoUpload
        memberId={1}
        photoUrl="https://cdn.example.com/photos/member-1.jpg"
        onUploaded={vi.fn()}
      />
    );

    const img = screen.getByRole('img', { name: 'Member photo' });
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('https://cdn.example.com/photos/member-1.jpg');
  });

  it('renders placeholder icon (no img) when photoUrl is undefined', () => {
    render(
      <PhotoUpload
        memberId={1}
        photoUrl={undefined}
        onUploaded={vi.fn()}
      />
    );

    expect(screen.queryByRole('img', { name: 'Member photo' })).toBeNull();
  });

  it('renders placeholder icon (no img) when photoUrl is null', () => {
    render(
      <PhotoUpload
        memberId={1}
        photoUrl={null}
        onUploaded={vi.fn()}
      />
    );

    expect(screen.queryByRole('img', { name: 'Member photo' })).toBeNull();
  });
});

// ─── Preservation 3: ProtectedRoute redirects genuinely unauthenticated users ─

describe('Preservation 3 — ProtectedRoute redirects to /login when definitively unauthenticated', () => {
  /**
   * Validates: Requirements 3.5, 3.6
   * Genuinely unauthenticated users (isLoading=false, isAuthenticated=false)
   * must still be redirected to /login after the fix.
   */

  it('calls router.replace("/login") when isAuthenticated=false and isLoading=false', () => {
    const mockReplace = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ replace: mockReplace, push: vi.fn() } as ReturnType<typeof useRouter>);

    vi.mocked(useAuthContext).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      getToken: vi.fn(),
    });

    render(
      <ProtectedRoute>
        <div data-testid="protected-content">Dashboard</div>
      </ProtectedRoute>
    );

    // Redirect to /login must fire for genuinely unauthenticated users
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('does NOT render protected children when isAuthenticated=false', () => {
    const mockReplace = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ replace: mockReplace, push: vi.fn() } as ReturnType<typeof useRouter>);

    vi.mocked(useAuthContext).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      getToken: vi.fn(),
    });

    render(
      <ProtectedRoute>
        <div data-testid="protected-content">Dashboard</div>
      </ProtectedRoute>
    );

    expect(screen.queryByTestId('protected-content')).toBeNull();
  });
});

// ─── Preservation 4: Dashboard content renders when authenticated ─────────────

describe('Preservation 4 — Dashboard content renders when isAuthenticated=true and isLoading=false', () => {
  /**
   * Validates: Requirements 3.6
   * When the user is authenticated and loading is complete,
   * ProtectedRoute must render its children correctly.
   */

  it('renders children when isAuthenticated=true and isLoading=false', () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: { sub: 'u1', email: 'admin@kairos.church', role: 'Admin', branchId: '1' },
      isAuthenticated: true,
      isLoading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      getToken: vi.fn(),
    });

    render(
      <ProtectedRoute>
        <div data-testid="dashboard-content">Dashboard Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('dashboard-content')).not.toBeNull();
  });

  it('shows loading spinner when isLoading=true (not blank, not children)', () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      signIn: vi.fn(),
      signOut: vi.fn(),
      getToken: vi.fn(),
    });

    render(
      <ProtectedRoute>
        <div data-testid="dashboard-content">Dashboard Content</div>
      </ProtectedRoute>
    );

    // Loading spinner should be shown
    expect(screen.getByRole('status')).not.toBeNull();
    // Children should NOT be shown during loading
    expect(screen.queryByTestId('dashboard-content')).toBeNull();
  });
});

// ─── Preservation 5: Property-based test — PhotoUpload always shows provided URL ─

describe('Preservation 5 — Property: PhotoUpload always displays provided photoUrl on initial render', () => {
  /**
   * Validates: Requirements 3.1
   * For any non-empty photoUrl string, PhotoUpload must display it as the img src
   * on initial render (before any upload action is taken).
   *
   * **Validates: Requirements 3.1**
   */

  it('always displays the provided photoUrl as img src on initial render (property-based)', () => {
    fc.assert(
      fc.property(
        // Generate non-empty strings that look like URLs or photo keys
        fc.oneof(
          fc.webUrl(),
          fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        ),
        (photoUrl) => {
          const { unmount } = render(
            <PhotoUpload
              memberId={1}
              photoUrl={photoUrl}
              onUploaded={vi.fn()}
            />
          );

          const img = screen.queryByRole('img', { name: 'Member photo' });
          const result = img !== null && img.getAttribute('src') === photoUrl;

          unmount();
          return result;
        }
      ),
      { numRuns: 50 }
    );
  });
});

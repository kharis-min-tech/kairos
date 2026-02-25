/**
 * Bug Condition Exploration Tests — Members Module
 *
 * These tests are written BEFORE any fix is applied.
 * They are EXPECTED TO FAIL on unfixed code — failure confirms the bugs exist.
 * DO NOT fix the source code when these tests fail.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';

// ─── Hoisted mocks (must be declared before vi.mock calls) ────────────────────

const { linkRenderSpy, membersListMock, membersGetPhotoUploadUrlMock, membersUpdateMock } =
  vi.hoisted(() => ({
    linkRenderSpy: vi.fn(),
    membersListMock: vi.fn().mockResolvedValue({
      data: [{ isActive: true }],
      pagination: { total: 1 },
    }),
    membersGetPhotoUploadUrlMock: vi.fn().mockResolvedValue({
      uploadUrl: 'https://s3.example.com/upload',
      photoKey: 'photos/1/new.jpg',
    }),
    membersUpdateMock: vi.fn().mockResolvedValue({}),
  }));

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock cognito to prevent CognitoUserPool initialization errors in test environment
vi.mock('@/lib/auth/cognito', () => ({
  getCurrentSession: vi.fn().mockResolvedValue(null),
  signIn: vi.fn(),
  signOut: vi.fn(),
  getIdToken: vi.fn().mockResolvedValue(null),
  refreshSession: vi.fn().mockResolvedValue(null),
  extractUser: vi.fn(),
}));

// Track whether Next.js Link was used (vs bare <a> tags)
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => {
    linkRenderSpy(href);
    return <a href={href} data-nextjs-link="true" {...props}>{children as React.ReactNode}</a>;
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({ replace: vi.fn(), push: vi.fn() })),
}));

vi.mock('@kairos/api-client', () => ({
  members: {
    list: membersListMock,
    getPhotoUploadUrl: membersGetPhotoUploadUrlMock,
    update: membersUpdateMock,
  },
}));

vi.mock('@/lib/auth', () => ({
  useAuth: vi.fn(() => ({
    user: { sub: 'u1', email: 'admin@kairos.church', role: 'Admin', branchId: '1' },
    isAuthenticated: true,
    isLoading: false,
  })),
}));

// ProtectedRoute imports useAuth from './auth-context' (relative), so we also mock that path
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

import { TopBar } from '@/components/layout/topbar';
import { PhotoUpload } from '@/app/(dashboard)/members/view/photo-upload';
import { AppShell } from '@/components/layout/app-shell';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { useAuth } from '@/lib/auth';
import { useAuth as useAuthContext } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  // Reset default mock implementations after clearAllMocks
  membersListMock.mockResolvedValue({
    data: [{ isActive: true }],
    pagination: { total: 1 },
  });
  membersGetPhotoUploadUrlMock.mockResolvedValue({
    uploadUrl: 'https://s3.example.com/upload',
    photoKey: 'photos/1/new.jpg',
  });
  membersUpdateMock.mockResolvedValue({});
  vi.mocked(useAuth).mockReturnValue({
    user: { sub: 'u1', email: 'admin@kairos.church', role: 'Admin', branchId: '1' },
    isAuthenticated: true,
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    getToken: vi.fn(),
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

// ─── Condition A: Routing Bugs (Profile & Settings links) ─────────────────────

describe('Condition A — Routing bugs: Profile and Settings links use bare <a> tags', () => {
  /**
   * BUG: TopBar uses bare <a href="/profile"> and <a href="/settings"> instead of
   * Next.js <Link> components. This causes full-page navigations that trigger the
   * dashboard error boundary.
   *
   * EXPECTED OUTCOME on unfixed code: FAILS
   * Counterexample: Profile/Settings links are bare <a> tags — Next.js Link was NOT used
   */

  it('Profile link should use Next.js Link component (not a bare <a> tag)', () => {
    /**
     * On unfixed code: topbar.tsx does NOT import next/link.
     * The Profile link is rendered as <a href="/profile"> — a bare anchor.
     * Our next/link mock adds data-nextjs-link="true" to any Link-rendered anchor.
     * On unfixed code: the Profile anchor will NOT have data-nextjs-link="true".
     * This assertion FAILS on unfixed code.
     */
    const { container } = render(<TopBar onMenuToggle={() => {}} />);
    const userMenuBtn = container.querySelector('[aria-label="User menu"]')!;
    fireEvent.click(userMenuBtn);

    const profileLink = container.querySelector('a[href="/profile"]');
    expect(profileLink).not.toBeNull();

    // EXPECTED TO FAIL on unfixed code:
    // Bare <a> tags do NOT have data-nextjs-link="true"
    // Next.js Link-rendered anchors DO have data-nextjs-link="true" (from our mock)
    expect(profileLink?.getAttribute('data-nextjs-link')).toBe('true');
  });

  it('Settings link should use Next.js Link component (not a bare <a> tag)', () => {
    /**
     * On unfixed code: topbar.tsx does NOT import next/link.
     * The Settings link is rendered as <a href="/settings"> — a bare anchor.
     * This assertion FAILS on unfixed code.
     */
    const { container } = render(<TopBar onMenuToggle={() => {}} />);
    const userMenuBtn = container.querySelector('[aria-label="User menu"]')!;
    fireEvent.click(userMenuBtn);

    const settingsLink = container.querySelector('a[href="/settings"]');
    expect(settingsLink).not.toBeNull();

    // EXPECTED TO FAIL on unfixed code:
    expect(settingsLink?.getAttribute('data-nextjs-link')).toBe('true');
  });

  it('Next.js Link component should be rendered for /profile and /settings routes', () => {
    /**
     * Verifies that the next/link mock was called with the correct hrefs.
     * On unfixed code: linkRenderSpy is never called for /profile or /settings
     * because next/link is not imported in topbar.tsx.
     * This assertion FAILS on unfixed code.
     */
    render(<TopBar onMenuToggle={() => {}} />);
    const userMenuBtn = screen.getByLabelText('User menu');
    fireEvent.click(userMenuBtn);

    // EXPECTED TO FAIL on unfixed code:
    // linkRenderSpy is never called because next/link is not used
    expect(linkRenderSpy).toHaveBeenCalledWith('/profile');
    expect(linkRenderSpy).toHaveBeenCalledWith('/settings');
  });
});

// ─── Condition B: Stale Photo Prop After Upload ───────────────────────────────

describe('Condition B — Stale photo prop: new image not shown immediately after upload', () => {
  /**
   * BUG: PhotoUpload uses the photoUrl prop directly for rendering.
   * After a successful upload, onUploaded() triggers an async re-fetch in the parent.
   * Until that async fetch completes and the parent updates the prop, the component
   * still renders the old photoUrl (or undefined).
   *
   * EXPECTED OUTCOME on unfixed code: FAILS
   * Counterexample: After upload, <img> src is still undefined/old value, not the new photoKey
   */

  it('should immediately show new image after successful upload (before async re-fetch)', async () => {
    /**
     * We render PhotoUpload with photoUrl=undefined.
     * We simulate a successful upload that returns photoKey='photos/1/new.jpg'.
     * We assert the <img> src is 'photos/1/new.jpg' immediately after upload.
     *
     * On unfixed code: PhotoUpload has no local state for the URL.
     * After upload, onUploaded() is called but the photoUrl prop is still undefined.
     * The component re-renders with photoUrl=undefined, so no <img> is shown.
     * This assertion FAILS on unfixed code.
     */
    const onUploaded = vi.fn();

    // Mock fetch for the S3 PUT request
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    render(
      <PhotoUpload
        memberId={1}
        photoUrl={undefined}
        onUploaded={onUploaded}
      />
    );

    // Initially: no image shown (photoUrl is undefined)
    expect(screen.queryByRole('img', { name: 'Member photo' })).toBeNull();

    // Simulate file selection and upload
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['photo-content'], 'photo.jpg', { type: 'image/jpeg' });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // Wait for upload to complete (members.update is called after S3 upload)
    await waitFor(() => {
      expect(membersUpdateMock).toHaveBeenCalledWith(1, { photoUrl: 'photos/1/new.jpg' });
    });

    // EXPECTED TO FAIL on unfixed code:
    // After upload, the component should immediately show the new image.
    // On unfixed code: photoUrl prop is still undefined (parent hasn't re-fetched yet),
    // so no <img> is rendered. The assertion fails.
    const img = screen.queryByRole('img', { name: 'Member photo' });
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('photos/1/new.jpg');

    global.fetch = originalFetch;
  });
});

// ─── Condition C: Email Contamination in AppShell ─────────────────────────────

describe('Condition C — Email contamination: AppShell calls members.list with admin email', () => {
  /**
   * BUG: AppShell calls members.list({ email: user.email, limit: 1 }) on mount
   * to check the current user's active status. This is the contaminating call that
   * causes the members list page to show only the admin's record.
   *
   * EXPECTED OUTCOME on unfixed code: FAILS
   * Counterexample: AppShell calls members.list with email='admin@kairos.church' and limit=1
   */

  it('AppShell should NOT call members.list with the admin email on mount', async () => {
    /**
     * On unfixed code: AppShell has a useEffect that calls
     * members.list({ email: user.email, limit: 1 }) where user.email = 'admin@kairos.church'.
     * This assertion FAILS on unfixed code because the call IS made.
     */
    await act(async () => {
      render(<AppShell>Dashboard Content</AppShell>);
    });

    // Wait for any async effects to complete
    await waitFor(() => {
      expect(membersListMock).toHaveBeenCalled();
    });

    // EXPECTED TO FAIL on unfixed code:
    // AppShell calls members.list({ email: 'admin@kairos.church', limit: 1 })
    // We assert it should NOT have been called with the admin's email
    const calls = membersListMock.mock.calls;
    const emailContaminatedCall = calls.find(
      (call) => call[0]?.email === 'admin@kairos.church'
    );
    expect(emailContaminatedCall).toBeUndefined(); // FAILS on unfixed code
  });

  it('AppShell should NOT call members.list with email + limit=1 on mount', async () => {
    /**
     * On unfixed code: AppShell calls members.list({ email: user.email, limit: 1 }).
     * The contaminating combination is email + limit=1 together.
     * Note: Sidebar legitimately calls members.list({ status: 'pending', limit: 1 })
     * to show a pending count badge — that call is expected and should NOT be flagged.
     * This assertion FAILS on unfixed code.
     */
    await act(async () => {
      render(<AppShell>Dashboard Content</AppShell>);
    });

    // Allow any async effects to settle
    await act(async () => {});

    // EXPECTED TO FAIL on unfixed code:
    // AppShell calls members.list({ email: 'admin@kairos.church', limit: 1 })
    // We assert no call has BOTH email AND limit=1 (the contaminating combination)
    const calls = membersListMock.mock.calls;
    const emailAndLimitOneCall = calls.find(
      (call) => call[0]?.email !== undefined && call[0]?.limit === 1
    );
    expect(emailAndLimitOneCall).toBeUndefined(); // FAILS on unfixed code
  });

  it('subsequent members.list calls should NOT include email or limit=1 from AppShell', async () => {
    /**
     * After AppShell mounts (making the contaminating call), a subsequent
     * members.list call from the members list page should have clean parameters.
     * The bug is that AppShell makes the call at all — we assert it should not.
     */
    await act(async () => {
      render(<AppShell>Dashboard Content</AppShell>);
    });

    // Simulate the members list page making its own call
    await act(async () => {
      await membersListMock({ page: 1, limit: 50 });
    });

    // EXPECTED TO FAIL on unfixed code:
    // AppShell calls members.list with email — this is the bug.
    const appShellEmailCall = membersListMock.mock.calls.find(
      (call) => call[0]?.email !== undefined
    );
    expect(appShellEmailCall).toBeUndefined(); // FAILS on unfixed code
  });
});

// ─── Condition D: Blank Screen on Refresh ────────────────────────────────────

describe('Condition D — Blank screen: ProtectedRoute renders null on transient session failure', () => {
  /**
   * BUG: When getCurrentSession() returns null transiently (e.g., on rapid page refreshes),
   * AuthProvider sets isAuthenticated=false and isLoading=false.
   * ProtectedRoute then returns null (blank screen) instead of showing a spinner
   * or retrying the session check.
   *
   * EXPECTED OUTCOME on unfixed code: FAILS
   * Counterexample: ProtectedRoute renders null (blank) when session is transiently null
   */

  it('ProtectedRoute should NOT render null (blank screen) when isAuthenticated=false after loading', () => {
    /**
     * We simulate the race condition:
     * - isLoading=false, isAuthenticated=false (transient null session)
     *
     * On unfixed code: ProtectedRoute returns null when !isAuthenticated after loading.
     * This causes a blank white screen.
     * This assertion FAILS on unfixed code.
     */
    const mockReplace = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ replace: mockReplace, push: vi.fn() } as ReturnType<typeof useRouter>);

    // Mock auth state: loading=false, authenticated=false (transient failure)
    // ProtectedRoute uses useAuth from './auth-context', so mock that path
    vi.mocked(useAuthContext).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      getToken: vi.fn(),
    });

    const { container } = render(
      <ProtectedRoute>
        <div data-testid="protected-content">Dashboard Content</div>
      </ProtectedRoute>
    );

    // EXPECTED TO FAIL on unfixed code:
    // On unfixed code: ProtectedRoute returns null when !isAuthenticated after loading.
    // The container will be empty (blank screen).
    // We assert it should NOT be blank — it should show a spinner or loading state
    // while retrying the session check.
    expect(container.firstChild).not.toBeNull(); // FAILS on unfixed code — renders null
  });

  it('ProtectedRoute should show spinner (not blank) during transient auth failure', () => {
    /**
     * The fix should show a spinner/loading state during the retry window,
     * not render null (blank screen).
     *
     * On unfixed code: ProtectedRoute returns null when !isAuthenticated.
     * This assertion FAILS on unfixed code.
     */
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
        <div>Dashboard</div>
      </ProtectedRoute>
    );

    // EXPECTED TO FAIL on unfixed code:
    // On unfixed code: no spinner is shown when !isAuthenticated after loading.
    // The fix should show a spinner during the retry window.
    // The spinner has role="status" (as seen in the existing loading spinner).
    // On unfixed code: no spinner is rendered (null is returned), so this FAILS.
    expect(screen.queryByRole('status')).not.toBeNull(); // FAILS on unfixed code
  });
});

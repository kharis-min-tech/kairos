import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './app-shell';
import { Breadcrumbs } from './breadcrumbs';
import { useUiStore } from '@/lib/stores/ui-store';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: vi.fn(() => ({
    user: { sub: 'u1', email: 'admin@kairos.church', role: 'Admin', branchId: '1', isApproved: true },
    isAuthenticated: true,
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    getToken: vi.fn(),
  })),
}));

vi.mock('@/lib/ws', () => ({
  useNotifications: vi.fn(() => ({
    notifications: [],
    unreadCount: 0,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    clearNotifications: vi.fn(),
    isConnected: false,
    toast: null,
    dismissToast: vi.fn(),
  })),
}));

vi.mock('@kairos/api-client', () => ({
  branches: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
  },
  members: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  // Reset zustand store to default (expanded sidebar)
  useUiStore.setState({ sidebarCollapsed: false, activeBranchId: null });
});

afterEach(() => {
  cleanup();
});

describe('AppShell', () => {
  it('renders the top bar with logo', () => {
    render(<AppShell>Content</AppShell>, { wrapper: createWrapper() });
    const banner = screen.getByRole('banner');
    expect(within(banner).getByText('Kairos')).toBeInTheDocument();
  });

  it('renders children in the main content area', () => {
    render(<AppShell>Hello Dashboard</AppShell>, { wrapper: createWrapper() });
    expect(screen.getByText('Hello Dashboard')).toBeInTheDocument();
  });

  it('renders sidebar navigation items', () => {
    render(<AppShell>Content</AppShell>, { wrapper: createWrapper() });
    const sidebar = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(sidebar).getByText('Dashboard')).toBeInTheDocument();
    expect(within(sidebar).getByText('Members')).toBeInTheDocument();
    expect(within(sidebar).getByText('Donations')).toBeInTheDocument();
    expect(within(sidebar).getByText('Reports')).toBeInTheDocument();
  });

  it('renders the notifications bell', () => {
    render(<AppShell>Content</AppShell>, { wrapper: createWrapper() });
    const banner = screen.getByRole('banner');
    expect(within(banner).getByLabelText(/notifications/i)).toBeInTheDocument();
  });

  it('renders the user menu button', () => {
    render(<AppShell>Content</AppShell>, { wrapper: createWrapper() });
    const banner = screen.getByRole('banner');
    expect(within(banner).getByLabelText('User menu')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<AppShell>Content</AppShell>, { wrapper: createWrapper() });
    const banner = screen.getByRole('banner');
    expect(within(banner).getByLabelText('Search')).toBeInTheDocument();
  });

  it('renders the branch selector', () => {
    render(<AppShell>Content</AppShell>, { wrapper: createWrapper() });
    const banner = screen.getByRole('banner');
    expect(within(banner).getByLabelText('Filter by branch')).toBeInTheDocument();
  });

  it('collapses sidebar when toggle is clicked', () => {
    render(<AppShell>Content</AppShell>, { wrapper: createWrapper() });
    const sidebar = screen.getByRole('navigation', { name: 'Main navigation' });
    const toggleBtn = within(sidebar).getByLabelText('Collapse sidebar');
    fireEvent.click(toggleBtn);
    expect(within(sidebar).getByLabelText('Expand sidebar')).toBeInTheDocument();
  });

  it('opens mobile nav when hamburger is clicked', () => {
    render(<AppShell>Content</AppShell>, { wrapper: createWrapper() });
    const banner = screen.getByRole('banner');
    const hamburger = within(banner).getByLabelText('Toggle navigation menu');
    fireEvent.click(hamburger);
    // MobileNav uses Sheet component - look for the mobile navigation nav
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument();
  });

  it('closes mobile nav when sheet is dismissed', () => {
    render(<AppShell>Content</AppShell>, { wrapper: createWrapper() });
    const banner = screen.getByRole('banner');
    const hamburger = within(banner).getByLabelText('Toggle navigation menu');
    fireEvent.click(hamburger);
    // MobileNav uses Radix Sheet with a built-in close button
    const closeBtn = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument();
  });

  it('renders user menu with Profile, Settings, and Sign out', async () => {
    const user = userEvent.setup();
    render(<AppShell>Content</AppShell>, { wrapper: createWrapper() });
    const userMenuBtn = screen.getByLabelText('User menu');
    await user.click(userMenuBtn);
    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });
    // "Settings" appears in both sidebar nav and dropdown — use the dropdown menu role
    const menuItems = screen.getAllByRole('menuitem');
    const menuTexts = menuItems.map(el => el.textContent);
    expect(menuTexts).toEqual(expect.arrayContaining([
      expect.stringContaining('Profile'),
      expect.stringContaining('Settings'),
      expect.stringContaining('Sign out'),
    ]));
  });

  it('highlights active nav item based on currentPath', async () => {
    const { usePathname } = await import('next/navigation');
    vi.mocked(usePathname).mockReturnValue('/members');
    render(<AppShell>Content</AppShell>, { wrapper: createWrapper() });
    const sidebar = screen.getByRole('navigation', { name: 'Main navigation' });
    const membersLink = within(sidebar).getByText('Members').closest('a');
    expect(membersLink).toHaveAttribute('aria-current', 'page');
    vi.mocked(usePathname).mockReturnValue('/dashboard');
  });
});

describe('Breadcrumbs', () => {
  it('renders breadcrumb items', () => {
    render(
      <Breadcrumbs items={[{ label: 'People', href: '/people' }, { label: 'John Doe' }]} />
    );
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(nav).getByText('People')).toBeInTheDocument();
    expect(within(nav).getByText('John Doe')).toBeInTheDocument();
  });

  it('marks the last item as current page', () => {
    render(
      <Breadcrumbs items={[{ label: 'People', href: '/people' }, { label: 'John Doe' }]} />
    );
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(nav).getByText('John Doe')).toHaveAttribute('aria-current', 'page');
  });

  it('renders nothing when items array is empty', () => {
    const { container } = render(<Breadcrumbs items={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders home link', () => {
    render(<Breadcrumbs items={[{ label: 'Dashboard' }]} />);
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(nav).getByLabelText('Home')).toBeInTheDocument();
  });
});

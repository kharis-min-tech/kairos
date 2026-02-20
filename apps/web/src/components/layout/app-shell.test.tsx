import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { AppShell } from './app-shell';
import { Breadcrumbs } from './breadcrumbs';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));

afterEach(() => {
  cleanup();
});

describe('AppShell', () => {
  it('renders the top bar with logo', () => {
    render(<AppShell>Content</AppShell>);
    const banner = screen.getByRole('banner');
    expect(within(banner).getByText('Kairos')).toBeInTheDocument();
  });

  it('renders children in the main content area', () => {
    render(<AppShell>Hello Dashboard</AppShell>);
    expect(screen.getByText('Hello Dashboard')).toBeInTheDocument();
  });

  it('renders sidebar navigation items', () => {
    render(<AppShell>Content</AppShell>);
    const sidebar = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(sidebar).getByText('Dashboard')).toBeInTheDocument();
    expect(within(sidebar).getByText('Members')).toBeInTheDocument();
    expect(within(sidebar).getByText('Donations')).toBeInTheDocument();
    expect(within(sidebar).getByText('Reports')).toBeInTheDocument();
  });

  it('renders the notifications bell', () => {
    render(<AppShell>Content</AppShell>);
    const banner = screen.getByRole('banner');
    expect(within(banner).getByLabelText(/notifications/i)).toBeInTheDocument();
  });

  it('renders the user menu button', () => {
    render(<AppShell>Content</AppShell>);
    const banner = screen.getByRole('banner');
    expect(within(banner).getByLabelText('User menu')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<AppShell>Content</AppShell>);
    const banner = screen.getByRole('banner');
    expect(within(banner).getByLabelText('Search')).toBeInTheDocument();
  });

  it('renders the branch selector', () => {
    render(<AppShell>Content</AppShell>);
    const banner = screen.getByRole('banner');
    expect(within(banner).getByLabelText('Select branch')).toBeInTheDocument();
  });

  it('collapses sidebar when toggle is clicked', () => {
    render(<AppShell>Content</AppShell>);
    const sidebar = screen.getByRole('navigation', { name: 'Main navigation' });
    const toggleBtn = within(sidebar).getByLabelText('Collapse sidebar');
    fireEvent.click(toggleBtn);
    expect(within(sidebar).getByLabelText('Expand sidebar')).toBeInTheDocument();
  });

  it('opens mobile nav when hamburger is clicked', () => {
    render(<AppShell>Content</AppShell>);
    const banner = screen.getByRole('banner');
    const hamburger = within(banner).getByLabelText('Toggle navigation menu');
    fireEvent.click(hamburger);
    expect(screen.getByLabelText('Close navigation menu')).toBeInTheDocument();
  });

  it('closes mobile nav when close button is clicked', () => {
    render(<AppShell>Content</AppShell>);
    const banner = screen.getByRole('banner');
    const hamburger = within(banner).getByLabelText('Toggle navigation menu');
    fireEvent.click(hamburger);
    const closeBtn = screen.getByLabelText('Close navigation menu');
    fireEvent.click(closeBtn);
    expect(screen.queryByLabelText('Close navigation menu')).not.toBeInTheDocument();
  });

  it('opens user menu dropdown on click', () => {
    render(<AppShell>Content</AppShell>);
    const banner = screen.getByRole('banner');
    const userMenuBtn = within(banner).getByLabelText('User menu');
    fireEvent.click(userMenuBtn);
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('highlights active nav item based on currentPath', async () => {
    const { usePathname } = await import('next/navigation');
    vi.mocked(usePathname).mockReturnValue('/members');
    render(<AppShell>Content</AppShell>);
    const sidebar = screen.getByRole('navigation', { name: 'Main navigation' });
    const membersLink = within(sidebar).getByText('Members').closest('a');
    expect(membersLink).toHaveAttribute('aria-current', 'page');
    vi.mocked(usePathname).mockReturnValue('/');
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

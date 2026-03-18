'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@kairos/ui';
import { cn } from '@kairos/ui';

type NavItem = {
  href: string;
  label: string;
  roles?: string[];
};

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/admin/branches', label: 'Branches', roles: ['admin'] },
  { href: '/members', label: 'Members', roles: ['admin', 'pastor'] },
  { href: '/fellowships', label: 'Fellowships' },
  { href: '/profile', label: 'Profile' },
];

function NavLink({ item, pathname, onClick }: { item: NavItem; pathname: string; onClick?: () => void }) {
  const isActive = item.href === '/dashboard'
    ? pathname === '/dashboard'
    : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {item.label}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNavItems = navItems.filter(
    (item) => !item.roles || (user?.systemRole && item.roles.includes(user.systemRole)),
  );

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="text-xl font-bold text-primary">
          Kairos
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </nav>

      <div className="border-t p-4">
        <p className="mb-2 truncate text-sm text-muted-foreground">
          {user?.firstName} {user?.lastName}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={logout}
        >
          Sign out
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-card transition-transform md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-14 items-center border-b px-4 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="mr-3 rounded p-1.5 hover:bg-muted"
            aria-label="Open navigation"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <rect y="3" width="20" height="2" rx="1" />
              <rect y="9" width="20" height="2" rx="1" />
              <rect y="15" width="20" height="2" rx="1" />
            </svg>
          </button>
          <span className="text-lg font-bold text-primary">Kairos</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

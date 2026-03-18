'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@kairos/ui';
import { cn } from '@kairos/ui';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/admin/branches', label: 'Branches', adminOnly: true },
  { href: '/members', label: 'Members' },
  { href: '/fellowships', label: 'Fellowships' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || user?.systemRole === 'admin',
  );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" className="text-xl font-bold text-primary">
            Kairos
          </Link>
        </div>

        <nav className="space-y-1 p-4">
          {visibleNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                pathname.startsWith(item.href)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t p-4">
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
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

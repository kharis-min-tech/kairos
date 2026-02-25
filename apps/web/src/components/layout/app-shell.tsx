'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { TopBar } from './topbar';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';
import { useAuth } from '@/lib/auth';
import { members } from '@kairos/api-client';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const currentPath = usePathname();
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [memberIsActive, setMemberIsActive] = useState<boolean | null>(null);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const toggleMobileNav = useCallback(() => {
    setMobileNavOpen((prev) => !prev);
  }, []);

  const closeMobileNav = useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  // Fetch current user's member record to check active status
  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    members
      .list({ email: user.email, limit: 1 })
      .then((res) => {
        if (cancelled) return;
        const match = res.data?.[0];
        setMemberIsActive(match ? match.isActive : null);
      })
      .catch(() => {
        if (!cancelled) setMemberIsActive(null);
      });
    return () => { cancelled = true; };
  }, [user?.email]);

  const isPending = user && memberIsActive === false;

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar onMenuToggle={toggleMobileNav} notificationCount={3} />

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        currentPath={currentPath}
        isPendingMember={!!isPending}
      />

      <MobileNav
        open={mobileNavOpen}
        onClose={closeMobileNav}
        currentPath={currentPath}
        isPendingMember={!!isPending}
      />

      <main
        className={`pt-16 transition-all duration-200 ease-in-out
          ${sidebarCollapsed ? 'sm:pl-16' : 'sm:pl-60'}`}
        aria-label="Main content"
      >
        {isPending && (
          <div className="mx-6 mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
            Your registration is pending approval. You will be notified once approved.
          </div>
        )}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

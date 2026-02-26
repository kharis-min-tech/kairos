'use client';

import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { TopBar } from './topbar';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';
import { useAuth } from '@/lib/auth';
import { useNotifications } from '@/lib/ws';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const currentPath = usePathname();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const toggleMobileNav = useCallback(() => {
    setMobileNavOpen((prev) => !prev);
  }, []);

  const closeMobileNav = useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  const isPending = user?.role === 'Member' && user?.isApproved === false;

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar onMenuToggle={toggleMobileNav} notificationCount={unreadCount} />

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

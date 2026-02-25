'use client';

import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { TopBar } from './topbar';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const currentPath = usePathname();
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

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar onMenuToggle={toggleMobileNav} notificationCount={3} />

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        currentPath={currentPath}
      />

      <MobileNav
        open={mobileNavOpen}
        onClose={closeMobileNav}
        currentPath={currentPath}
      />

      <main
        className={`pt-16 transition-all duration-200 ease-in-out
          ${sidebarCollapsed ? 'sm:pl-16' : 'sm:pl-60'}`}
        aria-label="Main content"
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

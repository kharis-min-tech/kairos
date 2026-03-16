'use client';

import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { TopBar } from './topbar';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';
import { BottomNav } from './bottom-nav';
import { useAuth } from '@/lib/auth';
import { useUiStore } from '@/lib/stores/ui-store';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const currentPath = usePathname();
  const { user } = useAuth();
  const { sidebarCollapsed } = useUiStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const toggleMobileNav = useCallback(() => {
    setMobileNavOpen((prev) => !prev);
  }, []);

  const closeMobileNav = useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  const isPending = user?.role === 'Member' && user?.isApproved === false;

  return (
    <div className="min-h-screen bg-background">
      <TopBar onMenuToggle={toggleMobileNav} />

      <Sidebar currentPath={currentPath} />

      <MobileNav
        open={mobileNavOpen}
        onClose={closeMobileNav}
        currentPath={currentPath}
      />

      <main
        className={cn(
          'pt-16 pb-20 md:pb-0 transition-all duration-200 ease-in-out',
          sidebarCollapsed ? 'md:pl-16' : 'md:pl-60',
        )}
        aria-label="Main content"
      >
        {isPending && (
          <div className="mx-6 mt-4 rounded-lg border border-warning bg-warning-light px-4 py-3 text-sm text-foreground" role="alert">
            Your registration is pending approval. You will be notified once approved.
          </div>
        )}
        <div className="p-6">{children}</div>
      </main>

      <BottomNav currentPath={currentPath} onMorePress={toggleMobileNav} />
    </div>
  );
}

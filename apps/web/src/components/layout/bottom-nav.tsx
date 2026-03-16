'use client';

import Link from 'next/link';
import { LayoutDashboard, Users, HandCoins, CalendarCheck, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const bottomTabs: BottomNavItem[] = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Members', href: '/members', icon: Users },
  { label: 'Attendance', href: '/attendance', icon: CalendarCheck },
  { label: 'Give', href: '/donations', icon: HandCoins },
];

interface BottomNavProps {
  currentPath: string;
  onMorePress: () => void;
}

export function BottomNav({ currentPath, onMorePress }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border bg-card md:hidden"
      aria-label="Bottom navigation"
    >
      {bottomTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentPath === tab.href || (tab.href !== '/dashboard' && currentPath.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 py-1 px-3 min-w-[64px] min-h-[48px] text-xs transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={22} />
            <span className="font-medium">{tab.label}</span>
          </Link>
        );
      })}

      {/* More button */}
      <button
        onClick={onMorePress}
        className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 min-w-[64px] min-h-[48px] text-xs text-muted-foreground hover:text-foreground transition-colors"
        aria-label="More options"
      >
        <MoreHorizontal size={22} />
        <span className="font-medium">More</span>
      </button>
    </nav>
  );
}

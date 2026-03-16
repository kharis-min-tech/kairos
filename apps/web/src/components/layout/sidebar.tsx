'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Building2,
  Layers,
  UsersRound,
  CalendarCheck,
  Heart,
  HandCoins,
  FileText,
  BarChart3,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { members } from '@kairos/api-client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth';
import { useUiStore } from '@/lib/stores/ui-store';
import { cn } from '@/lib/utils';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Roles that can see this item. undefined = visible to all. */
  roles?: string[];
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Members', href: '/members', icon: Users },
  { label: 'Branches', href: '/branches', icon: Building2, roles: ['Admin', 'Pastor'] },
  { label: 'Departments', href: '/departments', icon: Layers },
  { label: 'Fellowships', href: '/fellowships', icon: UsersRound },
  { label: 'Attendance', href: '/attendance', icon: CalendarCheck },
  { label: 'Outreach', href: '/outreach', icon: Heart },
  { label: 'Donations', href: '/donations', icon: HandCoins },
  { label: 'Forms', href: '/forms', icon: FileText },
  { label: 'Reports', href: '/reports', icon: BarChart3, roles: ['Admin', 'Pastor', 'Leader'] },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['Admin', 'Pastor'] },
];

const PENDING_ALLOWED = new Set(['Dashboard', 'Members']);

interface SidebarProps {
  currentPath?: string;
}

export function Sidebar({ currentPath = '' }: SidebarProps) {
  const { user } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const [pendingCount, setPendingCount] = useState(0);
  const isPending = user?.role === 'Member' && !user?.isApproved;
  const role = user?.role ?? 'Member';

  useEffect(() => {
    if (role === 'Admin' || role === 'Pastor') {
      members
        .list({ status: 'pending', limit: 1 })
        .then((res) => setPendingCount(res.pagination?.total ?? 0))
        .catch(() => setPendingCount(0));
    }
  }, [role]);

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(role),
  );

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed top-16 left-0 z-30 h-[calc(100vh-64px)] transition-all duration-200 ease-in-out bg-sidebar-bg text-sidebar-text hidden md:flex flex-col',
          sidebarCollapsed ? 'w-16' : 'w-60',
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {visibleItems.map((item) => {
              const isActive = currentPath === item.href || (item.href !== '/dashboard' && currentPath.startsWith(item.href));
              const isDisabled = isPending && !PENDING_ALLOWED.has(item.label);
              const Icon = item.icon;

              const linkContent = (
                <>
                  <span className="shrink-0 relative">
                    <Icon size={20} />
                    {sidebarCollapsed && item.label === 'Members' && pendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary-400">
                        <span className="sr-only">{pendingCount} pending</span>
                      </span>
                    )}
                  </span>
                  {!sidebarCollapsed && (
                    <span className="flex flex-1 items-center justify-between">
                      <span>{item.label}</span>
                      {item.label === 'Members' && pendingCount > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white min-w-[18px]">
                          {pendingCount}
                        </span>
                      )}
                    </span>
                  )}
                </>
              );

              const itemClasses = cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium min-h-[44px] transition-colors',
                sidebarCollapsed && 'justify-center',
                isDisabled && 'opacity-40 cursor-not-allowed',
                !isDisabled && isActive && 'bg-sidebar-active text-white',
                !isDisabled && !isActive && 'hover:bg-sidebar-hover hover:text-white',
              );

              const wrappedItem = isDisabled ? (
                <span className={itemClasses} aria-disabled="true">
                  {linkContent}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={itemClasses}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {linkContent}
                </Link>
              );

              return (
                <li key={item.href}>
                  {sidebarCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{wrappedItem}</TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    wrappedItem
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-sidebar-hover p-2">
          <button
            onClick={toggleSidebar}
            className="flex w-full items-center justify-center rounded-lg p-2.5 text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-colors min-h-[44px] min-w-[44px]"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}

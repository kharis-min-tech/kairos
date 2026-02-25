'use client';

import { useState, useEffect } from 'react';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { members } from '@kairos/api-client';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
  { label: 'Members', href: '/members', icon: <Users size={20} /> },
  { label: 'Branches', href: '/branches', icon: <Building2 size={20} /> },
  { label: 'Departments', href: '/departments', icon: <Layers size={20} /> },
  { label: 'Fellowships', href: '/fellowships', icon: <UsersRound size={20} /> },
  { label: 'Attendance', href: '/attendance', icon: <CalendarCheck size={20} /> },
  { label: 'Outreach', href: '/outreach', icon: <Heart size={20} /> },
  { label: 'Donations', href: '/donations', icon: <HandCoins size={20} /> },
  { label: 'Forms', href: '/forms', icon: <FileText size={20} /> },
  { label: 'Reports', href: '/reports', icon: <BarChart3 size={20} /> },
];

// Nav items allowed for pending (not yet approved) members
const PENDING_ALLOWED_LABELS = new Set(['Dashboard', 'Members']);

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  currentPath?: string;
  isPendingMember?: boolean;
}

export function Sidebar({ collapsed, onToggle, currentPath = '', isPendingMember = false }: SidebarProps) {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    members
      .list({ status: 'pending', limit: 1 })
      .then((res) => setPendingCount(res.pagination?.total ?? 0))
      .catch(() => setPendingCount(0));
  }, []);

  return (
    <aside
      className={`fixed top-16 left-0 z-30 h-[calc(100vh-64px)] transition-all duration-200 ease-in-out
        ${collapsed ? 'w-16' : 'w-60'}
        bg-sidebar-bg text-sidebar-text hidden sm:flex flex-col`}
      role="navigation"
      aria-label="Main navigation"
    >
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = currentPath.startsWith(item.href);
            const isDisabled = isPendingMember && !PENDING_ALLOWED_LABELS.has(item.label);
            return (
              <li key={item.href}>
                {isDisabled ? (
                  <span
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium min-h-[44px] opacity-40 cursor-not-allowed
                      ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? item.label : undefined}
                    aria-disabled="true"
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </span>
                ) : (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]
                    focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2 focus-visible:outline-none
                    ${isActive
                      ? 'bg-sidebar-active text-white'
                      : 'hover:bg-sidebar-hover hover:text-white'
                    }
                    ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="shrink-0 relative">
                    {item.icon}
                    {collapsed && item.label === 'Members' && pendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-purple-500" />
                    )}
                  </span>
                  {!collapsed && (
                    <span className="flex flex-1 items-center justify-between">
                      <span>{item.label}</span>
                      {item.label === 'Members' && pendingCount > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center rounded-full bg-purple-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white min-w-[18px]">
                          {pendingCount}
                        </span>
                      )}
                    </span>
                  )}
                </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-hover p-2">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-lg p-2.5 text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-colors min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2 focus-visible:outline-none"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </aside>
  );
}

export { navItems };

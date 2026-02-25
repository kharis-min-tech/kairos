'use client';

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

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  currentPath?: string;
}

export function Sidebar({ collapsed, onToggle, currentPath = '' }: SidebarProps) {
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
            return (
              <li key={item.href}>
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
                  <span className="shrink-0">{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
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

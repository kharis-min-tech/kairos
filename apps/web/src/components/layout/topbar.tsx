'use client';

import { Menu, Search, Bell, ChevronDown, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface TopBarProps {
  onMenuToggle: () => void;
  notificationCount?: number;
}

export function TopBar({ onMenuToggle, notificationCount = 0 }: TopBarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayCount = notificationCount > 99 ? '99+' : notificationCount;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 flex h-16 items-center border-b border-topbar-border bg-topbar-bg px-4"
      role="banner"
    >
      {/* Hamburger (mobile) */}
      <button
        onClick={onMenuToggle}
        className="mr-3 rounded-lg p-2 text-gray-600 hover:bg-gray-100 sm:hidden min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2 focus-visible:outline-none"
        aria-label="Toggle navigation menu"
      >
        <Menu size={24} />
      </button>

      {/* Logo */}
      <a href="/dashboard" className="flex items-center gap-2 mr-4" aria-label="Kairos home">
        <span className="text-xl font-bold text-primary">Kairos</span>
      </a>

      {/* Branch selector */}
      <div className="hidden md:flex items-center">
        <button
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 min-h-[44px] focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2 focus-visible:outline-none"
          aria-label="Select branch"
          aria-haspopup="listbox"
        >
          <span>All Branches</span>
          <ChevronDown size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="ml-auto flex items-center gap-2">
        <div className="hidden sm:flex items-center">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Search..."
              className="w-48 rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2 min-h-[44px] lg:w-64"
              aria-label="Search"
            />
          </div>
        </div>

        {/* Notifications */}
        <button
          className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100 min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2 focus-visible:outline-none"
          aria-label={`Notifications${notificationCount > 0 ? `, ${notificationCount} unread` : ''}`}
        >
          <Bell size={20} />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-highlight px-1 text-[10px] font-bold text-white">
              {displayCount}
            </span>
          )}
        </button>

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 rounded-lg p-2 text-gray-600 hover:bg-gray-100 min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2 focus-visible:outline-none"
            aria-label="User menu"
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
              <User size={16} />
            </div>
            <ChevronDown size={16} className="hidden sm:block" />
          </button>

          {userMenuOpen && (
            <div
              className="absolute right-0 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
              role="menu"
            >
              <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 min-h-[44px] flex items-center focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:outline-none" role="menuitem">
                Profile
              </Link>
              <Link href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 min-h-[44px] flex items-center focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:outline-none" role="menuitem">
                Settings
              </Link>
              <hr className="my-1 border-gray-200" />
              <button className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 min-h-[44px] focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:outline-none" role="menuitem">
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { navItems } from './sidebar';
import { useEffect } from 'react';

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  currentPath?: string;
}

export function MobileNav({ open, onClose, currentPath = '' }: MobileNavProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <nav className="fixed top-0 left-0 h-full w-64 bg-sidebar-bg text-sidebar-text shadow-xl">
        <div className="flex h-16 items-center justify-between border-b border-sidebar-hover px-4">
          <span className="text-lg font-bold text-white">Kairos</span>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-sidebar-text hover:bg-sidebar-hover hover:text-white min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2 focus-visible:outline-none"
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        </div>

        <ul className="space-y-1 p-2">
          {navItems.map((item) => {
            const isActive = currentPath.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]
                    focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2 focus-visible:outline-none
                    ${isActive
                      ? 'bg-sidebar-active text-white'
                      : 'hover:bg-sidebar-hover hover:text-white'
                    }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

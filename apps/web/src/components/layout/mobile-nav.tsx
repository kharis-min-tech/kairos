'use client';

import Link from 'next/link';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { navItems } from './sidebar';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const PENDING_ALLOWED = new Set(['Dashboard', 'Members']);

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  currentPath?: string;
}

export function MobileNav({ open, onClose, currentPath = '' }: MobileNavProps) {
  const { user } = useAuth();
  const isPending = user?.role === 'Member' && !user?.isApproved;
  const role = user?.role ?? 'Member';

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(role),
  );

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="left" className="w-64 bg-sidebar-bg text-sidebar-text p-0 border-none">
        <SheetHeader className="h-16 flex items-center px-4 border-b border-sidebar-hover">
          <SheetTitle className="text-lg font-bold text-white">Kairos</SheetTitle>
        </SheetHeader>

        <nav className="py-2" aria-label="Mobile navigation">
          <ul className="space-y-1 px-2">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.href || (item.href !== '/dashboard' && currentPath.startsWith(item.href));
              const isDisabled = isPending && !PENDING_ALLOWED.has(item.label);

              const itemClasses = cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium min-h-[44px] transition-colors',
                isDisabled && 'opacity-40 cursor-not-allowed',
                !isDisabled && isActive && 'bg-sidebar-active text-white',
                !isDisabled && !isActive && 'hover:bg-sidebar-hover hover:text-white',
              );

              return (
                <li key={item.href}>
                  {isDisabled ? (
                    <span className={itemClasses} aria-disabled="true">
                      <Icon size={20} className="shrink-0" />
                      <span>{item.label}</span>
                    </span>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={itemClasses}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon size={20} className="shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

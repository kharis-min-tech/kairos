'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface QuickAction {
  label: string;
  icon: ReactNode;
  href: string;
  color?: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

export function QuickActions({ actions, className }: QuickActionsProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-4', className)}>
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className={cn(
            'flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4',
            'text-center transition-colors hover:bg-accent/10 hover:border-primary/30',
          )}
        >
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              action.color ?? 'bg-primary/10 text-primary',
            )}
          >
            {action.icon}
          </div>
          <span className="text-xs font-medium text-foreground">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}

export type { QuickAction };

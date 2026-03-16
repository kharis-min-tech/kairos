'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DarkHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

export function DarkHeader({ title, subtitle, children, className }: DarkHeaderProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-gradient-to-r from-[hsl(var(--sidebar-background))] to-primary/90 p-6 text-white',
        className,
      )}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-white/70">{subtitle}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

import * as React from 'react';
import { cn } from '../lib/utils';

export interface EmptyStateProps {
  /**
   * Optional. Leave it out inside a section that already has a header, which
   * is the common case: a heading directly under a heading says it twice.
   */
  title?: string;
  /** One line. What is missing and what to do about it. */
  message: string;
  /** The primary action, for `screen` only. A section's action lives in its header. */
  action?: React.ReactNode;
  variant?: 'section' | 'screen';
  className?: string;
}

/**
 * What a list or section shows when it holds nothing.
 *
 * Deliberately has no icon slot. Empty states across the app used to be a
 * centred brand-tinted circle holding an icon that restated the heading, a
 * Baby above the words "No children", taking the largest block on the screen
 * at the moment the screen had least to say. It made the emptiness louder.
 *
 * It is a component rather than a convention because the convention is what
 * failed: each screen hand-rolled its own card and they drifted apart. There
 * is no `icon` prop on purpose, so the old shape cannot grow back one screen
 * at a time without someone changing this file and being seen doing it.
 */
export function EmptyState({
  title,
  message,
  action,
  variant = 'section',
  className,
}: EmptyStateProps) {
  const isScreen = variant === 'screen';
  return (
    <div className={cn(isScreen ? 'space-y-2 py-8' : 'space-y-1', className)}>
      {title ? (
        <p
          className={cn(
            'font-semibold text-foreground',
            isScreen ? 'text-base' : 'text-sm',
          )}
        >
          {title}
        </p>
      ) : null}
      <p className="max-w-[52ch] text-sm text-muted-foreground">{message}</p>
      {isScreen && action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

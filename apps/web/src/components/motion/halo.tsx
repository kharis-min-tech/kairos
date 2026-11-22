'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { pauseWhenIdle, prefersReducedMotion } from './observe';

/**
 * A gold light that circles the border of whatever it wraps (3.6s, linear).
 *
 * `durationMs` and `reverse` set the pace and direction per instance, so a
 * button that needs to pull harder than its neighbours can spin faster or
 * the other way round without every other halo on the page following it.
 *
 * The wrapper owns the 1.5px frame and clips an oversized rotating
 * conic-gradient; the child sits above it and keeps its own background, so
 * only the 1.5px rim shows. `radius` must match the child's corner radius
 * (pass the className for it). `base` paints a resting border behind the
 * light, for panels that should still read as bordered between sweeps.
 *
 * Under reduced motion the spinner is not rendered: the child just has its
 * normal edge (plus `base`, if any).
 */
export function Halo({
  children,
  radiusClass,
  variant = 'gold',
  baseClass = '',
  className = '',
  durationMs = 3600,
  reverse = false,
}: {
  children: ReactNode;
  radiusClass: string;
  variant?: 'gold' | 'purple';
  /** Background of the resting rim, e.g. 'bg-border'. */
  baseClass?: string;
  className?: string;
  /** One full circuit, in milliseconds. */
  durationMs?: number;
  /** Anticlockwise instead of clockwise. */
  reverse?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const spin = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    const sp = spin.current;
    if (!el || !sp) return;
    if (prefersReducedMotion()) {
      sp.style.display = 'none';
      return;
    }
    return pauseWhenIdle(el);
  }, []);

  const gradient =
    variant === 'gold'
      ? 'conic-gradient(from 0deg, transparent 0 70%, #F8B537 85%, #FFFFFF 90%, transparent 100%)'
      : 'conic-gradient(from 0deg, transparent 0 78%, #5D3FD3 88%, #F8B537 94%, transparent 100%)';

  return (
    <span
      ref={ref}
      className={`mo-halo relative inline-flex overflow-hidden p-[1.5px] ${radiusClass} ${baseClass} ${className}`}
    >
      <span
        ref={spin}
        aria-hidden
        className="mo-halo-spin pointer-events-none absolute left-1/2 top-1/2 block aspect-square w-[200%]"
        style={
          {
            background: gradient,
            transform: 'translate(-50%, -50%)',
            ['--mo-halo-duration' as string]: `${durationMs}ms`,
            ['--mo-halo-direction' as string]: reverse ? 'reverse' : 'normal',
          } as React.CSSProperties
        }
      />
      <span className={`relative flex w-full ${radiusClass}`}>{children}</span>
    </span>
  );
}

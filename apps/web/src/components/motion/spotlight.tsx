'use client';

import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from './observe';

/**
 * A soft purple glow that follows the cursor inside its parent. Drop it in as
 * the parent's first child; the parent needs `position: relative` (or
 * absolute). Fades in on enter, out on leave. Pointer-events none.
 */
export function Spotlight({
  size,
  alpha = 0.22,
  className = '',
}: {
  size: number;
  /** Peak opacity of the purple at the cursor. */
  alpha?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    if (!el || !host || prefersReducedMotion()) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      raf = 0;
      el.style.background = `radial-gradient(${size}px circle at ${x}px ${y}px, rgba(93,63,211,${alpha}), transparent 70%)`;
    };
    const onMove = (e: MouseEvent) => {
      const r = host.getBoundingClientRect();
      x = e.clientX - r.left;
      y = e.clientY - r.top;
      el.style.opacity = '1';
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      el.style.opacity = '0';
    };
    host.addEventListener('mousemove', onMove, { passive: true });
    host.addEventListener('mouseleave', onLeave);
    return () => {
      host.removeEventListener('mousemove', onMove);
      host.removeEventListener('mouseleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [size, alpha]);

  return <div ref={ref} aria-hidden className={`mo-spot pointer-events-none absolute inset-0 opacity-0 ${className}`} />;
}

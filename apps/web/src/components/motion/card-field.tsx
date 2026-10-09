'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { pauseWhenIdle, prefersReducedMotion } from './observe';

/**
 * Container for FloatCards. Tracks the pointer over its parent (the hero /
 * auth shell) and publishes it as --mx/--my in −0.5…0.5, rAF-throttled; the
 * cards translate from those in CSS. Also pauses drift while off-screen or the
 * tab is hidden.
 */
export function CardField({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    if (!el || !host || prefersReducedMotion()) return;

    const stopPause = pauseWhenIdle(el);
    let raf = 0;
    let nx = 0;
    let ny = 0;
    const flush = () => {
      raf = 0;
      el.style.setProperty('--mx', nx.toFixed(3));
      el.style.setProperty('--my', ny.toFixed(3));
    };
    const onMove = (e: MouseEvent) => {
      const r = host.getBoundingClientRect();
      nx = (e.clientX - r.left) / r.width - 0.5;
      ny = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(flush);
    };
    const onLeave = () => {
      nx = 0;
      ny = 0;
      if (!raf) raf = requestAnimationFrame(flush);
    };
    host.addEventListener('mousemove', onMove, { passive: true });
    host.addEventListener('mouseleave', onLeave);
    return () => {
      stopPause();
      host.removeEventListener('mousemove', onMove);
      host.removeEventListener('mouseleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

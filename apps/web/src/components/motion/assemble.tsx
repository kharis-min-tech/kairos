'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { prefersReducedMotion } from './observe';

/**
 * A product window that starts offset and rotated and settles as it scrolls
 * into view: p = clamp((vh − top) / (0.8·vh)), e = 1 − (1−p)³, then
 * translate(ax·(1−e), ay·(1−e)) rotate(ar·(1−e)) at opacity .15 + .85e.
 *
 * Put it on its own wrapper div, inside any element that already carries
 * layout transforms. Once settled it adds `.mo-in`, which the bars inside
 * (`.mo-bar-x/.mo-bar-y`) key off to grow. Horizontal travel is scaled down on
 * narrow screens so it can't push the page sideways.
 */
export function Assemble({
  ax,
  ay,
  ar,
  children,
  className = '',
}: {
  ax: number;
  ay: number;
  ar: number;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    el.classList.add('mo-armed');
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const top = el.getBoundingClientRect().top;
      if (top > vh * 1.5 || top < -vh * 3) {
        // Far off-screen: nothing visible to update.
        if (top > vh * 1.5) apply(0);
        return;
      }
      const p = Math.min(1, Math.max(0, (vh - top) / (vh * 0.8)));
      apply(1 - Math.pow(1 - p, 3));
    };
    const apply = (e: number) => {
      const k = Math.min(1, window.innerWidth / 1100);
      el.style.transform = `translate(${ax * k * (1 - e)}px, ${ay * (1 - e)}px) rotate(${ar * (1 - e)}deg)`;
      el.style.opacity = String(0.15 + 0.85 * e);
      if (e > 0.98) el.classList.add('mo-in');
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ax, ay, ar]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

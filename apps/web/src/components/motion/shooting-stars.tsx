'use client';

import { useEffect, useRef } from 'react';
import { pauseWhenIdle, prefersReducedMotion } from './observe';

/**
 * A field of shooting stars, in the two brand colours.
 *
 * Each star is a container that travels down-left, holding a bar rotated to
 * point back up-right so the trail is always behind the head. The bar is
 * rotated rather than the container because the container's transform is
 * being animated: rotating that too would send the star off along whatever
 * diagonal the rotation left it on.
 *
 * The positions and timings are a fixed table rather than Math.random. This
 * renders on the server first, and a random layout would differ between the
 * server's HTML and the client's first paint, which React treats as a
 * hydration mismatch and resolves by throwing the tree away.
 */
type Star = {
  /** Where it enters, in % of the viewport. */
  left: number;
  top: number;
  /** Trail length in px, seconds before it first runs, seconds per run. */
  len: number;
  delay: number;
  dur: number;
  /** How far it travels before fading, in vmax. */
  travel: number;
  gold?: boolean;
};

// Weighted toward purple: gold is the accent in this palette, not the base,
// and an even split reads as a different brand.
const STARS: Star[] = [
  { left: 18, top: -8, len: 120, delay: 0.0, dur: 3.4, travel: 70 },
  { left: 52, top: -12, len: 170, delay: 1.6, dur: 4.2, travel: 85, gold: true },
  { left: 84, top: -6, len: 110, delay: 0.8, dur: 3.0, travel: 60 },
  { left: 96, top: 12, len: 150, delay: 3.1, dur: 3.8, travel: 75 },
  { left: 36, top: -14, len: 90, delay: 4.4, dur: 2.8, travel: 55, gold: true },
  { left: 68, top: -10, len: 200, delay: 2.3, dur: 5.0, travel: 95 },
  { left: 8, top: 6, len: 100, delay: 5.6, dur: 3.2, travel: 62 },
  { left: 100, top: 30, len: 130, delay: 6.8, dur: 3.6, travel: 72, gold: true },
  { left: 44, top: -9, len: 140, delay: 7.9, dur: 4.0, travel: 80 },
];

const PURPLE = '#7c5cff';
const GOLD = '#f8b537';

export function ShootingStars({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.style.display = 'none';
      return;
    }
    // Stops while the page is scrolled past or the tab is hidden, rather than
    // animating nine elements forever in a background tab.
    return pauseWhenIdle(el);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden opacity-45 dark:opacity-100 ${className}`}
    >
      {STARS.map((s, i) => {
        const colour = s.gold ? GOLD : PURPLE;
        return (
          <span
            key={i}
            className="mo-star absolute block"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              ['--star-travel' as string]: `${s.travel}vmax`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.dur}s`,
            }}
          >
            <span
              className="mo-star-trail block"
              style={{
                width: `${s.len}px`,
                background: `linear-gradient(90deg, ${colour}, ${colour}00)`,
                boxShadow: `0 0 6px 1px ${colour}66`,
              }}
            />
          </span>
        );
      })}
    </div>
  );
}

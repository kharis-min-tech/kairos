'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { onceInView, prefersReducedMotion } from './observe';

type HandDrawnProps = {
  d: string;
  viewBox: string;
  stroke: string;
  strokeWidth: number;
  /** ms before the stroke starts. */
  delay?: number;
  /** ms. Default 900. */
  duration?: number;
  /** 'load' draws straight away; 'view' waits until the svg is scrolled in. */
  when?: 'load' | 'view';
  className?: string;
  style?: CSSProperties;
};

/**
 * A single stroked path that draws itself. `pathLength={1}` normalises the
 * dash so no measuring is needed (and a non-scaling stroke must not be used
 * here — it moves the dash into screen space and the draw stops working).
 *
 * Under reduced motion the path is simply drawn: the dash rules live behind
 * `no-preference` in globals.css.
 */
export function HandDrawn({
  d,
  viewBox,
  stroke,
  strokeWidth,
  delay = 0,
  duration = 900,
  when = 'view',
  className,
  style,
}: HandDrawnProps) {
  const ref = useRef<SVGPathElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    if (when === 'load') {
      // Next frame, so the hidden state has painted before the class lands.
      const id = requestAnimationFrame(() => el.classList.add('mo-in'));
      return () => cancelAnimationFrame(id);
    }
    return onceInView(el.ownerSVGElement ?? el, () => el.classList.add('mo-in'));
  }, [when]);

  return (
    <svg
      aria-hidden
      viewBox={viewBox}
      preserveAspectRatio="none"
      className={className}
      style={{ overflow: 'visible', ...style }}
    >
      <path
        ref={ref}
        d={d}
        pathLength={1}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className="mo-draw"
        style={{ ['--d' as string]: `${delay}ms`, ['--dur' as string]: `${duration}ms` }}
      />
    </svg>
  );
}

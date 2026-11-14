'use client';

import { createElement, useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { onceInView, prefersReducedMotion } from './observe';

type RevealProps = {
  as?: ElementType;
  /** Stagger slot: delay = index × 100ms unless `delay` is given. */
  index?: number;
  /** Explicit delay in ms (wins over `index`). */
  delay?: number;
  /** Duration in ms. Default 1100. */
  duration?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  [prop: string]: unknown;
};

/**
 * Scroll-in: lifts from 34px below, slightly shrunk and tilted, with a spring
 * overshoot. Fires once. The hidden state is CSS (`.mo-reveal`), gated on
 * no-preference, so reduced-motion users never see it hidden.
 */
export function Reveal({
  as = 'div',
  index = 0,
  delay,
  duration,
  className = '',
  style,
  children,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;
    return onceInView(el, () => el.classList.add('mo-in'));
  }, []);

  const vars = {
    '--d': `${delay ?? index * 100}ms`,
    ...(duration ? { '--dur': `${duration}ms` } : null),
    ...style,
  } as CSSProperties;

  return createElement(as, { ref, className: `mo-reveal ${className}`, style: vars, ...rest }, children);
}

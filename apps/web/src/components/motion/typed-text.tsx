'use client';

import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from './observe';

/**
 * Types `text` out: starts after `startDelay`, ~14ms a character, driven by
 * elapsed time so a slow frame doesn't slow the sentence. A gold caret blinks
 * at the end.
 *
 * The full sentence is always in the DOM for assistive tech and as the
 * reduced-motion result; the visible typed copy is aria-hidden. The block
 * keeps its full height from the first paint (the sr-only sentence sizes it
 * via an invisible copy), so the layout doesn't jump.
 */
export function TypedText({
  text,
  startDelay = 900,
  msPerChar = 14,
  className = '',
}: {
  text: string;
  startDelay?: number;
  msPerChar?: number;
  className?: string;
}) {
  const typed = useRef<HTMLSpanElement>(null);
  const caret = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const out = typed.current;
    const car = caret.current;
    if (!out || !car) return;
    if (prefersReducedMotion()) {
      out.textContent = text;
      car.style.display = 'none';
      return;
    }
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const n = Math.min(text.length, Math.max(0, Math.floor((now - start) / msPerChar)));
      out.textContent = text.slice(0, n);
      if (n < text.length) raf = requestAnimationFrame(tick);
    };
    const timer = window.setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, startDelay);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [text, startDelay, msPerChar]);

  return (
    <p className={`relative ${className}`}>
      <span className="sr-only">{text}</span>
      {/* Invisible full copy reserves the height. */}
      <span aria-hidden className="invisible">
        {text}
      </span>
      <span aria-hidden className="absolute inset-0">
        <span ref={typed} />
        <span
          ref={caret}
          className="mo-caret ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[0.18em] bg-[#F8B537]"
        />
      </span>
    </p>
  );
}

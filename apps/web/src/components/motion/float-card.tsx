import type { CSSProperties, ReactNode } from 'react';

type FloatCardProps = {
  /** Absolute placement within the CardField, e.g. { left: '5%', top: '9%' }. */
  position: CSSProperties;
  /** Parallax depth, 0.3–0.9. */
  depth: number;
  /** Fly-in offset (px) and rotation (deg) — where the card starts from. */
  fx: number;
  fy: number;
  fr: number;
  /** Resting tilt, deg. */
  tilt: number;
  /** Order, for stagger. Odd/even also picks the drift direction. */
  i: number;
  children: ReactNode;
  className?: string;
};

/**
 * Three nested wrappers so three transforms never fight: parallax (outer,
 * driven by CardField's --mx/--my), fly-in (middle), idle drift + resting tilt
 * (inner). Decorative — hidden from assistive tech.
 */
export function FloatCard({ position, depth, fx, fy, fr, tilt, i, children, className = '' }: FloatCardProps) {
  return (
    <div aria-hidden className="absolute" style={position}>
      <div className="mo-par" style={{ ['--depth' as string]: depth }}>
        <div
          className="mo-fly"
          style={{
            ['--fx' as string]: `${fx}px`,
            ['--fy' as string]: `${fy}px`,
            ['--fr' as string]: `${fr}deg`,
            ['--i' as string]: i,
          }}
        >
          <div
            className={`mo-drift ${className}`}
            style={{
              ['--tilt' as string]: `${tilt}deg`,
              ['--dir' as string]: i % 2 === 0 ? 1 : -1,
              ['--i' as string]: i,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

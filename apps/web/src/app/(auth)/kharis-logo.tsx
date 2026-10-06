/**
 * Kharis Church branding components for auth pages.
 *
 * The mark is a line-drawn dove. The paths live in @kairos/core so web and
 * mobile draw the identical bird; see `.dove-draw` in globals.css for the
 * animation this component opts into.
 *
 * - KharisDove: the mark itself, inheriting currentColor
 * - KharisLogoIcon: the dove in a purple tile — the brand lockup
 * - KharisCardHeader: dove + "Kharis Church" above a card heading
 */

import { DOVE_PATH, DOVE_VIEWBOX } from '@kairos/core';

/**
 * The mark.
 *
 * With `draw`, the outline strokes itself on first paint and the fill arrives
 * behind it — one brand beat, once, about 1.4s end to end. Under reduce-motion
 * the stroke never shows and the fill is simply there (globals.css gates it).
 */
export function KharisDove({
  size = 40,
  className,
  draw = false,
}: {
  size?: number;
  className?: string;
  draw?: boolean;
}) {
  return (
    <svg
      viewBox={DOVE_VIEWBOX}
      width={size}
      height={size}
      fill="none"
      role="img"
      aria-label="Kharis Church"
      className={draw ? `dove-draw ${className ?? ''}` : className}
    >
      <path className="dove-fill" d={DOVE_PATH} fill="currentColor" fillRule="evenodd" />
      {draw ? (
        <path
          className="dove-stroke"
          d={DOVE_PATH}
          stroke="currentColor"
          // User units, deliberately — not `vector-effect: non-scaling-stroke`.
          // That was here and it silently defeated the draw: with it set the
          // browser resolves the dash pattern in screen space, so pathLength
          // normalises nothing and a 1px dash against a 1px gap tiles the
          // ~266px outline into what reads as a solid line. The mark looked
          // fully drawn on the first frame and the animation was invisible.
          // In user units the stroke also scales with the mark, which is what
          // a logo wants. 12 ≈ 1px at the 27px the brand lockup renders at.
          strokeWidth={12}
          strokeLinejoin="round"
          // Normalised, so all six subpaths draw over the same beat however
          // long each one actually is.
          pathLength={1}
          strokeDasharray={1}
        />
      ) : null}
    </svg>
  );
}

/** Dove inside a purple rounded square — the brand lockup */
export function KharisLogoIcon({ size = 40, draw = false }: { size?: number; draw?: boolean }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl bg-gradient-to-br from-[#451ebb] to-[#5d3fd3]"
      style={{ width: size, height: size }}
    >
      <KharisDove size={size * 0.68} className="text-white" draw={draw} />
    </div>
  );
}

/** Dove + "Kharis Church" — used above card headings */
export function KharisCardHeader({ heading, subtitle }: { heading: React.ReactNode; subtitle: React.ReactNode }) {
  return (
    <div className="px-1 text-center">
      <div className="mb-4 flex items-center justify-center gap-2">
        <KharisDove size={22} className="text-gray-900/80 dark:text-white/80" />
        <span className="text-sm font-medium text-muted-foreground">Kharis Church</span>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

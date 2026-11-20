/**
 * iKharis branding components for auth pages.
 *
 * The mark is the iK monogram — a dove-inspired wing resolving into the
 * lowercase `i` and uppercase `K`. The paths live in @kairos/core so web and
 * mobile draw the identical mark; see `.mark-draw` in globals.css for the
 * animation this component opts into.
 *
 * - KharisMark: the mark itself, brand shapes inheriting currentColor
 * - KharisLogo: the horizontal lockup — the mark with "haris" beside it
 * - KharisLogoIcon: the mark in a purple tile, for square slots
 * - KharisCardHeader: the heading block above an auth card
 */

import {
  LOCKUP_ASPECT,
  LOCKUP_VIEWBOX,
  MARK_ACCENT,
  MARK_PATH,
  MARK_SUBPATHS,
  MARK_VIEWBOX,
  WORDMARK_LETTERS,
} from '@kairos/core';

/**
 * The mark.
 *
 * With `draw`, each shape's outline inks itself on first paint and the fill
 * arrives behind it — one brand beat, once, about 1.4s end to end. Under
 * reduce-motion the stroke never shows and the fill is simply there
 * (globals.css gates it).
 *
 * `tone` decides the `i` dot. `brand` gives it the gold it has in the primary
 * lockup; `mono` lets it inherit `currentColor` with everything else, which is
 * what the reversed tile and the single-colour proofs need — gold on purple is
 * muddy, and gold at 22px is a speck.
 */
export function KharisMark({
  size = 40,
  className,
  draw = false,
  tone = 'brand',
}: {
  size?: number;
  className?: string;
  draw?: boolean;
  tone?: 'brand' | 'mono';
}) {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      width={size}
      height={size}
      fill="none"
      role="img"
      aria-label="iKharis"
      className={draw ? `mark-draw ${className ?? ''}` : className}
    >
      {MARK_SUBPATHS.map((sub, i) => (
        <path
          key={i}
          className="mark-fill"
          d={sub.d}
          fill={sub.role === 'accent' && tone === 'brand' ? MARK_ACCENT : 'currentColor'}
        />
      ))}
      {draw ? (
        <path
          className="mark-stroke"
          d={MARK_PATH}
          stroke="currentColor"
          // User units, deliberately — not `vector-effect: non-scaling-stroke`.
          // That was here for the dove and it silently defeated the draw: with
          // it set the browser resolves the dash pattern in screen space, so
          // pathLength normalises nothing and a 1px dash against a 1px gap
          // tiles the outline into what reads as a solid line. The mark looked
          // fully drawn on the first frame and the animation was invisible.
          // In user units the stroke also scales with the mark, which is what
          // a logo wants. 5 ≈ 1px at the 27px the brand lockup renders at,
          // against this mark's 143.4 viewBox.
          strokeWidth={5}
          strokeLinejoin="round"
          // Normalised, so all three subpaths draw over the same beat however
          // long each one actually is.
          pathLength={1}
          strokeDasharray={1}
        />
      ) : null}
    </svg>
  );
}

/**
 * The horizontal lockup: the mark with "haris" set beside it.
 *
 * This is the logo. Reach for it anywhere the product has to name itself —
 * headers, the landing nav, anywhere "iKharis" was previously set as text
 * next to an icon. The lettering is outlined vector from the same Figma
 * board as the mark, so it never waits on a webfont and never reflows the
 * hand-tuned spacing between the K and the h.
 *
 * Sized by HEIGHT, not by a single `size`, because a lockup is nearly 3:1 and
 * what a header actually needs to control is how tall it sits. The width
 * follows from the artwork.
 *
 * The `i` dot keeps its gold on both light and dark grounds — gold reads on
 * either, and it is the one accent in the identity. `tone="mono"` drops it
 * into currentColor for the cases that need a true single colour: on the
 * purple tile, and at sizes where a two-pixel gold speck is just dirt.
 */
export function KharisLogo({
  height = 28,
  className,
  draw = false,
  tone = 'brand',
}: {
  height?: number;
  className?: string;
  draw?: boolean;
  tone?: 'brand' | 'mono';
}) {
  return (
    <svg
      viewBox={LOCKUP_VIEWBOX}
      width={height * LOCKUP_ASPECT}
      height={height}
      fill="none"
      role="img"
      aria-label="iKharis"
      className={draw ? `mark-draw ${className ?? ''}` : className}
    >
      {MARK_SUBPATHS.map((sub, i) => (
        <path
          key={i}
          className="mark-fill"
          d={sub.d}
          fill={sub.role === 'accent' && tone === 'brand' ? MARK_ACCENT : 'currentColor'}
        />
      ))}
      {WORDMARK_LETTERS.map((letter) => (
        <path key={letter.letter} className="wordmark-fill" d={letter.d} fill="currentColor" />
      ))}
      {draw ? (
        // The mark inks itself; the name is never drawn, only faded in after.
        // See MARK_PATH's note in @kairos/core for why the stroke is in user
        // units. 5 is the same ratio as the standalone mark, because the
        // lockup's viewBox shares the mark's coordinate space exactly.
        <path
          className="mark-stroke"
          d={MARK_PATH}
          stroke="currentColor"
          strokeWidth={5}
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
        />
      ) : null}
    </svg>
  );
}

/** The mark inside a purple rounded square — for square slots (app icon, avatars) */
export function KharisLogoIcon({ size = 40, draw = false }: { size?: number; draw?: boolean }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl bg-gradient-to-br from-[#451ebb] to-[#5d3fd3]"
      style={{ width: size, height: size }}
    >
      {/* `mono` on purple: the whole mark goes white, as the icon sheet draws it. */}
      <KharisMark size={size * 0.68} className="text-white" draw={draw} tone="mono" />
    </div>
  );
}

/**
 * The heading block above an auth card.
 *
 * It used to carry a muted mark and "Kharis Church" above the heading. That
 * row went: the auth shell already shows the full lockup — in the brand
 * column at xl, and directly above the card below it — so the card was
 * branding itself a second time, in a third treatment, a few pixels under the
 * real one. Removing it also lets the heading be the first thing read, which
 * is what the page is actually for.
 */
export function KharisCardHeader({ heading, subtitle }: { heading: React.ReactNode; subtitle: React.ReactNode }) {
  return (
    <div className="px-1 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

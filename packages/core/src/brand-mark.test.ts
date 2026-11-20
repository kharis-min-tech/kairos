import { describe, it, expect } from 'vitest';
import {
  MARK_HEIGHT,
  MARK_PATH,
  MARK_SMALL_PATH,
  MARK_SMALL_SUBPATHS,
  MARK_SMALL_VIEWBOX,
  MARK_SUBPATHS,
  MARK_VIEWBOX,
  MARK_WIDTH,
  LOCKUP_ASPECT,
  LOCKUP_HEIGHT,
  LOCKUP_VIEWBOX,
  LOCKUP_WIDTH,
  WORDMARK_LETTERS,
  WORDMARK_PATH,
  type MarkSubpath,
} from './brand-mark';

/**
 * Measures a path the way a browser's getTotalLength does, by walking it.
 *
 * Only the commands Figma emits for this artwork: M C L V H Z. It exists so
 * the declared `length` on each subpath can be checked against the geometry it
 * claims to describe — see the test below for why that matters.
 */
function measure(d: string): number {
  const toks = d.match(/[MCLVHZmclvhz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  let i = 0;
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let total = 0;
  let cmd: string | null = null;
  const num = () => parseFloat(toks[i++]!);
  const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(bx - ax, by - ay);

  while (i < toks.length) {
    if (/^[MCLVHZmclvhz]$/.test(toks[i]!)) cmd = toks[i++]!;
    if (cmd === 'M' || cmd === 'm') {
      cx = num();
      cy = num();
      sx = cx;
      sy = cy;
      cmd = cmd === 'M' ? 'L' : 'l';
    } else if (cmd === 'C' || cmd === 'c') {
      const x1 = num();
      const y1 = num();
      const x2 = num();
      const y2 = num();
      const x = num();
      const y = num();
      const steps = 400;
      let px = cx;
      let py = cy;
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const mt = 1 - t;
        const qx = mt * mt * mt * cx + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x;
        const qy = mt * mt * mt * cy + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y;
        total += dist(px, py, qx, qy);
        px = qx;
        py = qy;
      }
      cx = x;
      cy = y;
    } else if (cmd === 'L' || cmd === 'l') {
      const x = num();
      const y = num();
      total += dist(cx, cy, x, y);
      cx = x;
      cy = y;
    } else if (cmd === 'V' || cmd === 'v') {
      const y = num();
      total += Math.abs(y - cy);
      cy = y;
    } else if (cmd === 'H' || cmd === 'h') {
      const x = num();
      total += Math.abs(x - cx);
      cx = x;
    } else if (cmd === 'Z' || cmd === 'z') {
      total += dist(cx, cy, sx, sy);
      cx = sx;
      cy = sy;
    } else {
      i++;
    }
  }
  return total;
}

function parseViewBox(vb: string) {
  const [minX, minY, w, h] = vb.split(' ').map(Number) as [number, number, number, number];
  return { minX, minY, w, h };
}

describe('the iKharis mark', () => {
  /**
   * Every call site passes one `size` and gets width AND height from it
   * (`<KharisMark size={40} />`, `size * 0.68` inside the tile). The artwork is
   * 143.4 by 125, so a viewBox that is not square would stretch the mark on
   * every screen in both apps.
   */
  it('has a square viewBox, so one size prop cannot squash it', () => {
    const { w, h } = parseViewBox(MARK_VIEWBOX);
    expect(w).toBe(h);
    expect(w).toBe(MARK_WIDTH);
  });

  /**
   * The square is made by starting the viewBox above the art rather than by
   * wrapping it in a transform, so the art has to actually land centred. If
   * minY drifts the mark sits high or low in its tile and nothing else catches
   * it.
   */
  it('centres the art vertically inside that square', () => {
    const { minY, h } = parseViewBox(MARK_VIEWBOX);
    const above = -minY;
    const below = h - MARK_HEIGHT - above;
    expect(above).toBeCloseTo(below, 6);
    expect(above).toBeCloseTo((MARK_WIDTH - MARK_HEIGHT) / 2, 6);
  });

  it('centres the small-size art too', () => {
    const { minY, h } = parseViewBox(MARK_SMALL_VIEWBOX);
    const above = -minY;
    const below = h - 11.9839 - above;
    expect(above).toBeCloseTo(below, 6);
  });

  /**
   * THE one that matters for the draw animation.
   *
   * React Native cannot use SVG's `pathLength`, so the mobile component feeds
   * each subpath's declared `length` straight into `strokeDasharray` and
   * `strokeDashoffset`. If somebody adjusts a `d` and leaves `length` behind,
   * nothing fails to compile and no other test notices — the mark just draws
   * wrong on mobile only: a shape finishing early, or never closing. Web is
   * unaffected because it normalises with pathLength, so this would also be
   * invisible to anyone checking in a browser.
   */
  it.each([
    ['primary', MARK_SUBPATHS],
    ['small-size', MARK_SMALL_SUBPATHS],
  ] as const)('declares a true length for every %s subpath', (_name, set: readonly MarkSubpath[]) => {
    for (const sub of set) {
      const actual = measure(sub.d);
      // 1%. The declared values carry two decimals precisely so this can stay
      // tight: the smallest subpath is the 2px dot at 6.28 units, and rounding
      // that to a whole number would alone be a 4.5% error.
      expect(Math.abs(actual - sub.length) / actual).toBeLessThan(0.01);
    }
  });

  /**
   * The gold `i` dot is the only shape that carries its own colour; everything
   * else inherits currentColor so the mark can be purple, white or black
   * without knowing which. Losing that split would either make the whole mark
   * gold or strand the dot when the mark is reversed.
   */
  it('marks exactly one subpath as the accent', () => {
    expect(MARK_SUBPATHS.filter((s) => s.role === 'accent')).toHaveLength(1);
    expect(MARK_SUBPATHS.filter((s) => s.role === 'brand')).toHaveLength(2);
  });

  /**
   * At 16px a gold dot is two pixels of mud rather than an accent, which is
   * why Figma draws the small master in one colour. A stray accent here would
   * put gold back into the favicon.
   */
  it('keeps the small-size master single-colour', () => {
    expect(MARK_SMALL_SUBPATHS.every((s) => s.role === 'brand')).toBe(true);
  });

  it('concatenates every subpath into the single-path form', () => {
    expect(MARK_PATH).toBe(MARK_SUBPATHS.map((s) => s.d).join(''));
    expect(MARK_SMALL_PATH).toBe(MARK_SMALL_SUBPATHS.map((s) => s.d).join(''));
    // Each subpath is a closed shape, so the joined form must stay fillable.
    expect(MARK_PATH.startsWith('M')).toBe(true);
    expect(MARK_PATH.match(/Z/g)).toHaveLength(MARK_SUBPATHS.length);
  });
});

/**
 * Walks every endpoint and control point of a path.
 *
 * The convex hull of a Bézier's control points always contains the curve, so
 * a box that fits the hull certainly fits the ink. That is the direction the
 * tests below need: they are checking that nothing escapes the viewBox.
 */
function hull(d: string) {
  const toks = d.match(/[MCLVHZmclvhz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  let i = 0;
  let cmd: string | null = null;
  let cx = 0;
  let cy = 0;
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const num = () => parseFloat(toks[i++]!);
  const see = (x: number, y: number) => {
    box.x0 = Math.min(box.x0, x);
    box.y0 = Math.min(box.y0, y);
    box.x1 = Math.max(box.x1, x);
    box.y1 = Math.max(box.y1, y);
  };
  while (i < toks.length) {
    if (/^[MCLVHZmclvhz]$/.test(toks[i]!)) cmd = toks[i++]!;
    if (cmd === 'M' || cmd === 'L') {
      cx = num();
      cy = num();
      see(cx, cy);
    } else if (cmd === 'C') {
      for (let p = 0; p < 3; p++) {
        cx = num();
        cy = num();
        see(cx, cy);
      }
    } else if (cmd === 'V') {
      cy = num();
      see(cx, cy);
    } else if (cmd === 'H') {
      cx = num();
      see(cx, cy);
    } else if (cmd === 'Z') {
      cmd = null;
    } else {
      i++;
    }
  }
  return box;
}

function unionHull(ds: readonly string[]) {
  return ds.map(hull).reduce((a, b) => ({
    x0: Math.min(a.x0, b.x0),
    y0: Math.min(a.y0, b.y0),
    x1: Math.max(a.x1, b.x1),
    y1: Math.max(a.y1, b.y1),
  }));
}

describe('the iKharis lockup', () => {
  /**
   * The lockup is one flat path list in one viewBox — the lettering was
   * translated into the mark's own coordinate space rather than nested in a
   * transform. That makes it cheap for both renderers and impossible for the
   * two halves to disagree, but it also means a regenerated `haris` that
   * forgets the translate would sit on top of the mark and nothing would
   * throw. These two tests are what notices.
   */
  it('fits the whole lockup inside its viewBox', () => {
    const { minX, minY, w, h } = parseViewBox(LOCKUP_VIEWBOX);
    const all = unionHull([...MARK_SUBPATHS.map((s) => s.d), ...WORDMARK_LETTERS.map((l) => l.d)]);
    expect(all.x0).toBeGreaterThanOrEqual(minX);
    expect(all.y0).toBeGreaterThanOrEqual(minY);
    expect(all.x1).toBeLessThanOrEqual(minX + w + 0.001);
    expect(all.y1).toBeLessThanOrEqual(minY + h + 0.001);
  });

  it('sets the lettering clear of the mark, not over it', () => {
    const mark = unionHull(MARK_SUBPATHS.map((s) => s.d));
    const name = unionHull(WORDMARK_LETTERS.map((l) => l.d));
    // Figma cuts the K–h gap by hand against the K's lower arm. It is small,
    // so this asserts a real gap rather than a generous one.
    expect(name.x0).toBeGreaterThan(mark.x1);
    expect(name.x0 - mark.x1).toBeLessThan(20);
  });

  /**
   * Call sites size the lockup by height (`<KharisLogo height={26} />`) and
   * derive the width from this. A stale aspect squashes the logo in every
   * header at once.
   */
  it('reports an aspect the callers can size by', () => {
    expect(LOCKUP_ASPECT).toBeCloseTo(LOCKUP_WIDTH / LOCKUP_HEIGHT, 10);
    const { w, h } = parseViewBox(LOCKUP_VIEWBOX);
    expect(w).toBeCloseTo(LOCKUP_WIDTH, 6);
    expect(h).toBeCloseTo(LOCKUP_HEIGHT, 6);
  });

  it('spells haris, once each, in reading order', () => {
    expect(WORDMARK_LETTERS.map((l) => l.letter).join('')).toBe('haris');
  });

  it('concatenates the letters into the single-path form', () => {
    expect(WORDMARK_PATH).toBe(WORDMARK_LETTERS.map((l) => l.d).join(''));
    expect(WORDMARK_PATH.startsWith('M')).toBe(true);
    // h, i and a each close two subpaths (counter, dot, bowl); r and s one.
    expect(WORDMARK_PATH.match(/Z/g)).toHaveLength(8);
  });
});

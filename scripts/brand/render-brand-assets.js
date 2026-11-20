/**
 * Renders every raster brand asset from the vector mark in @kairos/core.
 *
 * Run from the repo root:  node scripts/brand/render-brand-assets.js
 *
 * The point of generating rather than exporting from Figma by hand is that
 * each target has its own constraints — Android's safe zone, the splash's
 * render width, the favicon needing different geometry entirely — and those
 * are arithmetic, not taste. Re-run it whenever the paths change.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '../..');

// Read the paths straight out of the source of truth rather than duplicating
// them, so these assets can never silently drift from what the apps render.
const src = fs.readFileSync(path.join(ROOT, 'packages/core/src/brand-mark.ts'), 'utf8');
function subpaths(constName) {
  const block = src.split(`export const ${constName}`)[1].split('];')[0];
  return [...block.matchAll(/role: '(\w+)',\s*\n\s*length: [\d.]+,\s*\n\s*d:\s*'([^']+)'/g)].map(
    (m) => ({ role: m[1], d: m[2] }),
  );
}

const PRIMARY = subpaths('MARK_SUBPATHS');
const SMALL = subpaths('MARK_SMALL_SUBPATHS');

const PURPLE = '#5D3FD3';
const WHITE = '#ffffff';

const VB = { primary: { w: 143.401, h: 125 }, small: { w: 14, h: 11.9839 } };

/**
 * One square PNG.
 *
 * `cover` is the fraction of the canvas the mark's own square occupies. The
 * mark is wider than it is tall, so it is centred inside that square — the
 * nested viewBox starts above the art by half the difference, exactly as
 * MARK_VIEWBOX does.
 */
function svg({ size, cover, bg, fill, paths, vb }) {
  const yOff = (vb.w - vb.h) / 2;
  const inner = size * cover;
  const off = (size - inner) / 2;
  const shapes = paths.map((p) => `<path d="${p.d}" fill="${fill}"/>`).join('');
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      (bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : '') +
      `<svg x="${off}" y="${off}" width="${inner}" height="${inner}" viewBox="0 ${-yOff} ${vb.w} ${vb.w}">${shapes}</svg>` +
      `</svg>`,
  );
}

const targets = [
  {
    out: 'apps/web/public/logo.png',
    size: 512,
    cover: 0.62,
    bg: PURPLE,
    fill: WHITE,
    set: PRIMARY,
    vb: VB.primary,
    note: 'favicon + apple-touch — opaque tile, visible on any tab strip',
  },
  {
    out: 'apps/mobile/assets/icon.png',
    size: 1024,
    cover: 0.62,
    bg: PURPLE,
    fill: WHITE,
    set: PRIMARY,
    vb: VB.primary,
    note: 'iOS/Android app icon — full bleed, OS rounds the corners',
  },
  {
    out: 'apps/mobile/assets/adaptive-icon.png',
    size: 1024,
    cover: 0.45,
    bg: null,
    fill: WHITE,
    set: PRIMARY,
    vb: VB.primary,
    note: 'Android foreground — transparent, composited on #5D3FD3, safe zone',
  },
  {
    out: 'apps/mobile/assets/splash-icon.png',
    size: 512,
    cover: 0.82,
    bg: null,
    fill: WHITE,
    set: PRIMARY,
    vb: VB.primary,
    note: 'splash — transparent, drawn 200px wide on #5D3FD3',
  },
  {
    out: 'apps/mobile/assets/favicon.png',
    size: 48,
    cover: 0.68,
    bg: PURPLE,
    fill: WHITE,
    set: SMALL,
    vb: VB.small,
    note: 'expo web favicon — small-size geometry, survives downscaling',
  },
];

(async () => {
  for (const t of targets) {
    const buf = svg({ size: t.size, cover: t.cover, bg: t.bg, fill: t.fill, paths: t.set, vb: t.vb });
    const dest = path.join(ROOT, t.out);
    await sharp(buf, { density: 384 }).png({ compressionLevel: 9 }).toFile(dest);
    const { size } = fs.statSync(dest);
    console.log(
      `${t.out.padEnd(38)} ${String(t.size).padStart(4)}px  ${String(Math.round(size / 1024)).padStart(4)}K  ${t.note}`,
    );
  }
})();

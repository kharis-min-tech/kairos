#!/usr/bin/env node
/**
 * Every <SectionClip> and tour video the handbook references, checked against
 * what is actually in apps/docs/public/clips.
 *
 *   node check-clips.mjs
 *
 * The component builds its own filename from the page's slug and the reader's
 * language, so a missing clip is not a broken link anybody would notice at
 * build time — the page renders, the player just never plays. This is the
 * check that does notice.
 */
import { readFileSync, existsSync, globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DOCS = join(HERE, '..', '..', 'apps', 'docs');
const CLIPS = join(DOCS, 'public', 'clips');

/** A page under fr/ asks for `-fr`; the English tree asks for no suffix. */
const suffixOf = (rel) => {
  const top = rel.split('/')[0];
  return ['fr', 'kri', 'tw'].includes(top) ? `-${top}` : '';
};

const pages = globSync('**/*.md', { cwd: DOCS }).filter((p) => !p.includes('node_modules'));

const want = new Map(); // clip base -> pages asking for it
for (const rel of pages) {
  const src = readFileSync(join(DOCS, rel), 'utf8');
  const suffix = suffixOf(rel);
  for (const m of src.matchAll(/<SectionClip slug="([^"]+)"/g)) {
    const base = m[1].replace(/\//g, '-') + suffix;
    (want.get(base) ?? want.set(base, []).get(base)).push(rel);
  }
  // The video-tour page names its three role tours in a script block.
  for (const m of src.matchAll(/id: '(member|pastor|admin)'/g)) {
    const base = m[1] + suffix;
    (want.get(base) ?? want.set(base, []).get(base)).push(rel);
  }
  if (/clip\('general'\)/.test(src)) {
    const base = `general${suffix}`;
    (want.get(base) ?? want.set(base, []).get(base)).push(rel);
  }
}

const missing = [...want.keys()].filter((b) => !existsSync(join(CLIPS, `${b}.mp4`))).sort();
const noPoster = [...want.keys()]
  .filter((b) => existsSync(join(CLIPS, `${b}.mp4`)) && !existsSync(join(CLIPS, `${b}.jpg`)))
  .sort();

console.log(`${want.size} clips referenced by ${pages.length} pages`);
console.log(`${want.size - missing.length} present, ${missing.length} missing`);
if (noPoster.length) console.log(`${noPoster.length} present but with no poster frame`);

if (missing.length) {
  console.log('\nmissing:');
  for (const b of missing) console.log(`  ${b}`);
}
process.exit(missing.length ? 1 : 0);

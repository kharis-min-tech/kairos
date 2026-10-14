#!/usr/bin/env node
/**
 * Fill a language's gaps by reusing translations it already has.
 *
 *   node tools/i18n-audit/propagate.mjs mobile
 *
 * Extraction creates a key per occurrence, so the same English string often
 * arrives under several keys in different namespaces: "Cancel" appears in a
 * dozen screens. Where a language already translates that exact English
 * string under some other key, copy it rather than asking a human to write
 * "Annuler" for the thirteenth time.
 *
 * Only exact, case-sensitive matches are reused. Anything genuinely new is
 * left missing, and `audit.mjs` lists it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const app = process.argv[2];
const DIRS = { mobile: 'apps/mobile/locales', web: 'apps/web/locales' };
const dir = DIRS[app];
if (!dir) {
  console.error('usage: propagate.mjs <mobile|web>');
  process.exit(1);
}

const load = (l) => JSON.parse(readFileSync(join(ROOT, dir, `${l}.json`), 'utf8'));
const paths = (o, p = '') =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' ? paths(v, `${p}${k}.`) : [`${p}${k}`]);
const get = (o, d) => d.split('.').reduce((n, k) => (n == null ? n : n[k]), o);
const set = (o, d, v) => {
  const parts = d.split('.');
  let n = o;
  for (const k of parts.slice(0, -1)) n = n[k] ??= {};
  n[parts.at(-1)] = v;
};

const en = load('en');
const enPaths = paths(en);

for (const lang of ['fr', 'kri', 'tw']) {
  const cat = load(lang);
  const have = new Set(paths(cat));

  // English string -> the translation this language already uses for it.
  const seen = new Map();
  for (const p of have) {
    const source = get(en, p);
    const target = get(cat, p);
    if (typeof source === 'string' && typeof target === 'string' && source !== target) {
      if (!seen.has(source)) seen.set(source, target);
    }
  }

  let filled = 0;
  const missing = [];
  for (const p of enPaths) {
    if (have.has(p)) continue;
    const source = get(en, p);
    const known = seen.get(source);
    if (known) {
      set(cat, p, known);
      filled++;
    } else {
      missing.push(p);
    }
  }

  writeFileSync(join(ROOT, dir, `${lang}.json`), `${JSON.stringify(cat, null, 2)}\n`);
  console.log(`${lang}: reused ${filled}, still to translate ${missing.length}`);
}

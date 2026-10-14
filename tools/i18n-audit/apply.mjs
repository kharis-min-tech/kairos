#!/usr/bin/env node
/** Write a translation batch into the catalogues.
 *    node tools/i18n-audit/apply.mjs mobile batch.json
 *  batch.json: { "ns.key": { "fr": "...", "kri": "...", "tw": "..." }, ... } */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const DIRS = { mobile: 'apps/mobile/locales', web: 'apps/web/locales' };
const [app, file] = process.argv.slice(2);
const dir = DIRS[app];
const batch = JSON.parse(readFileSync(file, 'utf8'));
const set = (o, d, v) => { const p = d.split('.'); let n = o;
  for (const k of p.slice(0, -1)) n = n[k] ??= {}; n[p.at(-1)] = v; };
for (const lang of ['fr', 'kri', 'tw']) {
  const p = join(ROOT, dir, `${lang}.json`);
  const cat = JSON.parse(readFileSync(p, 'utf8'));
  let n = 0;
  for (const [key, vals] of Object.entries(batch)) {
    if (vals[lang]) { set(cat, key, vals[lang]); n++; }
  }
  writeFileSync(p, `${JSON.stringify(cat, null, 2)}\n`);
  console.log(`${lang}: +${n}`);
}

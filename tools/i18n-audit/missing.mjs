#!/usr/bin/env node
/** Print the keys a language still needs, with their English, as JSON.
 *    node tools/i18n-audit/missing.mjs mobile fr [namespace]        */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const DIRS = { mobile: 'apps/mobile/locales', web: 'apps/web/locales' };
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const [app, lang, ns] = args;
const load = (l) => JSON.parse(readFileSync(join(ROOT, DIRS[app], `${l}.json`), 'utf8'));
const paths = (o, p = '') => Object.entries(o).flatMap(([k, v]) =>
  v && typeof v === 'object' ? paths(v, `${p}${k}.`) : [`${p}${k}`]);
const get = (o, d) => d.split('.').reduce((n, k) => (n == null ? n : n[k]), o);
const en = load(app === 'web' ? 'en' : 'en'), cat = load(lang);
const have = new Set(paths(cat));
const miss = paths(en).filter((p) => !have.has(p)).filter((p) => !ns || p.startsWith(`${ns}.`));
if (process.argv.includes('--counts')) {
  const by = {};
  for (const p of miss) by[p.split('.')[0]] = (by[p.split('.')[0]] ?? 0) + 1;
  console.log(Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${String(v).padStart(4)}  ${k}`).join('\n'));
} else {
  console.log(JSON.stringify(Object.fromEntries(miss.map((p) => [p, get(en, p)])), null, 1));
}

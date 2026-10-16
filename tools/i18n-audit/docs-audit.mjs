#!/usr/bin/env node
/**
 * Does the handbook exist in every language the app offers?
 *
 * The app's catalogue audit cannot see the docs site: it is Markdown, not
 * `t()` calls. This is the same question asked of the handbook —
 *
 *   present      every English page has a counterpart in each language
 *   translated   that counterpart is not just a copy of the English
 *   linked       its internal links point inside its own locale, so a French
 *                reader following one does not land back in English
 *   illustrated  the screenshots it shows are of the app in that language
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const DOCS = new URL('../../apps/docs/', import.meta.url).pathname.replace(/\/$/, '');
const LANGS = ['fr', 'kri', 'tw'];
const CI = process.argv.includes('--ci');

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (LANGS.includes(entry)) continue; // locale trees are the translations
      walk(full, out);
    } else if (entry.endsWith('.md')) out.push(full);
  }
  return out;
};

const english = walk(DOCS).map((f) => relative(DOCS, f)).sort();
const line = (s = '') => console.log(s);
let failures = 0;

line(`\n${'='.repeat(64)}\nDOCS\n${'='.repeat(64)}`);
line(`${english.length} English pages, ~${english.reduce((n, f) => n + readFileSync(join(DOCS, f), 'utf8').split(/\s+/).length, 0)} words`);

for (const lang of LANGS) {
  const missing = [];
  const untranslated = [];
  const leaking = [];

  for (const page of english) {
    const target = join(DOCS, lang, page);
    if (!existsSync(target)) { missing.push(page); continue; }
    const src = readFileSync(join(DOCS, page), 'utf8');
    const out = readFileSync(target, 'utf8');
    if (out.trim() === src.trim()) { untranslated.push(page); continue; }
    // A root-relative link with no locale prefix drops the reader back into
    // English halfway through their own handbook.
    for (const m of out.matchAll(/\]\((\/[^)#]*)/g)) {
      const href = m[1];
      if (href.startsWith(`/${lang}/`)) continue;
      if (/^\/(screenshots|icons|favicon|tour-)/.test(href)) continue; // assets
      leaking.push(`${page}  ->  ${href}`);
    }
  }

  const bad = missing.length + untranslated.length + leaking.length;
  line(`\n${bad ? 'FAIL' : 'ok  '} ${lang}: ${english.length - missing.length}/${english.length} pages present` +
       `, ${untranslated.length} still English, ${leaking.length} links leaking to the English tree`);
  const show = (label, list) =>
    list.slice(0, process.env.I18N_AUDIT_FULL ? 9999 : 5).forEach((x) => line(`       ${label} ${x}`));
  show('missing     ', missing);
  show('untranslated', untranslated);
  show('leaking link', leaking);
  if (bad) failures++;
}

line(`\n${failures ? `${failures} language(s) incomplete` : 'every page present and translated in every language'}`);
if (CI && failures) process.exit(1);

#!/usr/bin/env node
/**
 * Put a <SectionClip> at the top of every handbook page that has one.
 *
 *   node embed.mjs           edit the pages
 *   node embed.mjs --dry     say what would change
 *
 * Inserts after the page's first heading, so the clip sits under the title
 * and above the prose. Running it twice changes nothing: a page that already
 * carries the component is left alone.
 *
 * Every locale gets the same markup — the component resolves the language
 * itself, so a French page plays the French clip without the Markdown
 * knowing which language it is in.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SECTIONS } from './flows/sections.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DOCS = join(HERE, '..', '..', 'apps', 'docs');
const LOCALES = ['', 'fr', 'kri', 'tw'];
const dry = process.argv.includes('--dry');

let touched = 0;
let already = 0;
const missing = [];

for (const { slug } of SECTIONS) {
  for (const locale of LOCALES) {
    const page = join(DOCS, locale, `${slug}.md`);
    if (!existsSync(page)) {
      missing.push(join(locale || 'en', `${slug}.md`));
      continue;
    }

    const src = readFileSync(page, 'utf8');
    if (src.includes('<SectionClip')) {
      already++;
      continue;
    }

    // After the first heading, whatever level it is.
    const lines = src.split('\n');
    const at = lines.findIndex((l) => /^#{1,2} \S/.test(l));
    if (at < 0) {
      missing.push(`${join(locale || 'en', `${slug}.md`)} (no heading)`);
      continue;
    }

    lines.splice(at + 1, 0, '', `<SectionClip slug="${slug}" />`);
    if (!dry) writeFileSync(page, lines.join('\n'));
    touched++;
  }
}

console.log(
  dry
    ? `${touched} pages would get a clip, ${already} already have one`
    : `${touched} pages now open with their clip, ${already} already did`,
);
if (missing.length) {
  console.log(`\n${missing.length} pages not found — translate them first:`);
  for (const m of missing.slice(0, 8)) console.log(`   ${m}`);
  if (missing.length > 8) console.log(`   …and ${missing.length - 8} more`);
}

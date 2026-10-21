#!/usr/bin/env node
/**
 * Turn the compact script tables into the per-flow, per-language JSON files
 * that voice.mjs reads.
 *
 *   node narration/src/build.mjs
 *
 * The tables are `[title, caption, speech]` triples so a whole clip is three
 * lines rather than fifteen, and so the four languages sit side by side where
 * a missing one is obvious. This expands them.
 */
import { writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { listFlows } from '../../flows/index.mjs';
import { VOICE_FOR_LANG } from '../../lib/deepgram.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..');

const LANGS = ['en', 'fr', 'kri', 'tw'];
// A voice speaks one language. Naming the same English voice for both is
// what made the French clips an American reading French words.
const VOICE = VOICE_FOR_LANG;

const tables = {};
for (const lang of LANGS) {
  const file = join(HERE, `${lang}.mjs`);
  tables[lang] = existsSync(file) ? (await import(file)).default : {};
}

const flows = await listFlows();
let written = 0;
const missing = [];

for (const flow of flows) {
  for (const lang of LANGS) {
    const rows = tables[lang][flow];
    if (!rows) {
      missing.push(`${flow} (${lang})`);
      continue;
    }
    const slug = lang === 'en' ? flow : `${flow}-${lang}`;
    writeFileSync(
      join(OUT, `${slug}.json`),
      `${JSON.stringify({
        role: slug,
        lang,
        voice: VOICE[lang],
        stops: rows.map(([title, caption, speech], i) => ({
          n: i + 1, title, caption, speech,
        })),
      }, null, 2)}\n`,
    );
    written++;
  }
}

console.log(`${written} narration files written`);
if (missing.length) {
  console.log(`\n${missing.length} still to write:`);
  const byLang = {};
  for (const m of missing) {
    const lang = m.match(/\((\w+)\)$/)[1];
    (byLang[lang] ??= []).push(m.replace(/ \(\w+\)$/, ''));
  }
  for (const [lang, list] of Object.entries(byLang)) {
    console.log(`  ${lang}: ${list.length}${list.length <= 4 ? ` — ${list.join(', ')}` : ''}`);
  }
}

#!/usr/bin/env node
/**
 * Audit the translation system.
 *
 *   node tools/i18n-audit/audit.mjs            report
 *   node tools/i18n-audit/audit.mjs --ci       report, and exit 1 on a hard failure
 *
 * Hard failures are the ones that put wrong text in front of a user:
 *
 *   referenced-but-missing   code asks for a key the base catalogue lacks, so
 *                            i18next renders the key path
 *   malformed key            t('ns.key') instead of t('ns:key'), which looks
 *                            up "ns.key" inside the first namespace and misses
 *   empty value              renders as a blank label rather than falling back
 *   missing in a language    that language silently shows English
 *
 * Hardcoded strings are reported as a coverage number, not a failure: they are
 * work remaining, and failing on them would mean the check can never pass
 * until the last screen is done.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const CI = process.argv.includes('--ci');

/** Apps that have, or should have, a translation catalogue. */
const APPS = [
  { name: 'mobile', src: 'apps/mobile', locales: 'apps/mobile/locales', base: 'en' },
  { name: 'web', src: 'apps/web/src', locales: 'apps/web/locales', base: 'en' },
];

const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.expo' || entry === '.next') continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (['.ts', '.tsx'].includes(extname(p)) && !/\.(test|spec)\./.test(entry)) out.push(p);
  }
  return out;
};

const paths = (o, prefix = '') =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? paths(v, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );

const valueAt = (o, dotted) => dotted.split('.').reduce((n, k) => (n == null ? n : n[k]), o);

/**
 * Rough count of user-facing strings still written into the source.
 *
 * Scans the body of each prose element rather than only uninterrupted text
 * runs. An earlier version matched `>text<` with no `{`, `}` or `<` inside,
 * which silently skipped every paragraph containing an HTML entity, an
 * interpolated version number, or an inline <strong>/<Link> -- that is most of
 * a legal document, so four long documents read as fully translated while ~100
 * strings were still hardcoded. Here the inline tags, interpolations and
 * entities are stripped out and whatever prose is left over is what counts.
 */
const PROSE_TAGS = 'p|li|h1|h2|h3|h4|td|th|strong|em|figcaption|blockquote|label|option|summary';
// Text handed to a component as children or as a title prop is just as visible
// as text in a <p>, and the tag list alone never sees it. Five numbered
// subheadings sat untranslated inside <SubHeading>…</SubHeading> on the privacy
// notice while the file reported clean.
const CUSTOM_CHILDREN = /<([A-Z]\w+)(\s[^>]*)?>([\s\S]*?)<\/\1>/g;
const TITLE_PROP = /\btitle="([^"]{4,160})"/g;

function hardcoded(file) {
  const src = readFileSync(file, 'utf8');
  let n = 0;
  // display props
  // `text` was missing from this list, which is how the homepage's hero
  // strapline stayed English in every language without the audit noticing.
  n += (src.match(/\b(?:label|placeholder|title|accessibilityLabel|accessibilityHint|subtitle|heading|emptyText|text|alt|caption|description|tooltip|ariaLabel|confirmText|cancelText|submitText|helperText)="[A-Z][^"]{1,160}"/g) ?? []).length;

  const re = new RegExp(`<(${PROSE_TAGS})\\b[^>]*>([\\s\\S]*?)</\\1>`, 'g');
  for (const m of src.matchAll(re)) {
    const text = m[2]
      .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ') // {/* jsx comment */}
      .replace(/\/\*[\s\S]*?\*\//g, ' ')            // /* block comment */
      .replace(/(^|\s)\/\/[^\n]*/g, ' ')             // // line comment
      .replace(/<[^>]+>/g, ' ')      // inline elements
      .replace(/\{[^{}]*\}/g, ' ')   // interpolations, including t(...) calls
      .replace(/&[a-z]+;/g, ' ')     // HTML entities
      .replace(/\s+/g, ' ')
      .trim();
    // Two or more real words left over means prose nobody has keyed yet.
    if (!/[A-Za-z]{3}\s+\S|^[A-Za-z]{4,}$/.test(text)) continue;
    n++;
  }

  for (const m of src.matchAll(CUSTOM_CHILDREN)) {
    // Only when the children are bare text. A component wrapping further
    // elements is a layout wrapper, and counting it double-counts whatever is
    // nested inside -- which turned a useful signal into several hundred
    // phantom hits across both apps.
    if (/[<>]/.test(m[3])) continue;
    const text = m[3]
      .replace(/\{[^{}]*\}/g, ' ')
      .replace(/&[a-z]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!/[A-Za-z]{3}\s+\S|^[A-Za-z]{4,}$/.test(text)) continue;
    n++;
  }
  for (const m of src.matchAll(TITLE_PROP)) {
    if (/^[A-Za-z]/.test(m[1])) n++;
  }
  // Toasts are as user-facing as anything on the page and live in callbacks,
  // so no amount of JSX scanning finds them. There were 133 of them.
  for (const m of src.matchAll(/toast\.(?:success|error|info|warning|message)\(\s*['"`]([^'"`]{3,})/g)) {
    if (/[A-Za-z]{3}/.test(m[1])) n++;
  }
  // A t() call written as JSX inside a template literal. `{t('k')}` in an
  // HTML string is literal text, not a call -- the mobile data export shipped
  // "{t('security:kharisMyData')}" as its document heading. HTML uses class=,
  // JSX uses className=, which tells the two apart.
  for (const m of src.matchAll(/^.*\bclass="[^"]*".*$/gm)) {
    if (/(?<!\$)\{t\(/.test(m[0])) n++;
  }
  // English on both arms of a ternary -- button labels that flip while saving,
  // show/hide aria-labels, empty states. These sit inside a JSX expression, so
  // stripping {...} hid every one of them; there were 141.
  for (const m of src.matchAll(/\?\s*'([A-Z][^']{2,90})'\s*:\s*'([A-Z][^']{2,90})'/g)) {
    if (/[A-Za-z]{3}/.test(m[1]) && /[A-Za-z]{3}/.test(m[2])) n += 2;
  }
  return n;
}

let hardFailures = 0;
const line = (s = '') => console.log(s);

for (const app of APPS) {
  line(`\n${'='.repeat(64)}\n${app.name.toUpperCase()}\n${'='.repeat(64)}`);

  const localeDir = join(ROOT, app.locales);
  const srcDir = join(ROOT, app.src);
  const files = walk(srcDir);

  if (!existsSync(localeDir)) {
    const total = files.reduce((a, f) => a + hardcoded(f), 0);
    line(`no catalogue at ${app.locales}`);
    line(`${files.length} source files, ~${total} user-facing strings, none translatable`);
    line('FAIL: this app has no translation system at all');
    hardFailures++;
    continue;
  }

  const locales = readdirSync(localeDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
  const cats = Object.fromEntries(
    locales.map((l) => [l, JSON.parse(readFileSync(join(localeDir, `${l}.json`), 'utf8'))]),
  );
  const base = cats[app.base];
  const basePaths = paths(base);

  line(`languages: ${locales.join(', ')}  |  base '${app.base}' has ${basePaths.length} keys`);

  // 1. parity
  for (const l of locales.filter((x) => x !== app.base)) {
    const lp = paths(cats[l]);
    const missing = basePaths.filter((p) => !lp.includes(p));
    const extra = lp.filter((p) => !basePaths.includes(p));
    const flag = missing.length || extra.length ? 'FAIL' : 'ok  ';
    line(`${flag} ${l}: ${missing.length} missing, ${extra.length} not in base`);
    if (missing.length) {
      hardFailures++;
      missing.slice(0, 5).forEach((p) => line(`       missing: ${p}`));
    }
    if (extra.length) hardFailures++;
  }

  // 2. empty values
  const empties = [];
  for (const l of locales) for (const p of paths(cats[l])) if (valueAt(cats[l], p) === '') empties.push(`${l}:${p}`);
  line(`${empties.length ? 'FAIL' : 'ok  '} empty values: ${empties.length}`);
  if (empties.length) hardFailures++;

  // 2b. Cyrillic or Greek letters that look exactly like Latin ones. These
  // render correctly, so they survive review, but they break search, sort and
  // every string comparison against the Latin spelling. Krio and Twi use
  // Latin-script extensions, so a Cyrillic letter is always a mistake.
  const CONFUSABLE = /[\u0400-\u04FF\u0370-\u03FF]/;
  const confusables = [];
  for (const l of locales) {
    for (const p of paths(cats[l])) {
      const v = valueAt(cats[l], p);
      if (typeof v === 'string' && CONFUSABLE.test(v)) confusables.push(`${l}:${p}  ${v.slice(0, 50)}`);
    }
  }
  line(`${confusables.length ? 'FAIL' : 'ok  '} Cyrillic/Greek look-alike letters: ${confusables.length}`);
  confusables.slice(0, 5).forEach((c) => line(`       ${c}`));
  if (confusables.length) hardFailures++;

  // 3. keys the code asks for
  const referenced = new Set();
  const malformed = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*['"`]([^'"`]+)['"`]/g)) {
      const key = m[1];
      if (key.includes(':')) referenced.add(key);
      // a dotted key whose head is a real namespace means the ns: was forgotten
      else if (Object.keys(base).includes(key.split('.')[0])) malformed.push(`${relative(ROOT, f)}  t('${key}')`);
    }
  }
  line(`${malformed.length ? 'FAIL' : 'ok  '} malformed keys (ns. instead of ns:): ${malformed.length}`);
  malformed.slice(0, 5).forEach((m) => line(`       ${m}`));
  if (malformed.length) hardFailures++;

  // A plural key is stored per i18next plural category, so t('ns:thing') is
  // satisfied by thing_one / thing_other and never by a bare `thing`.
  const PLURAL_SUFFIXES = ['zero', 'one', 'two', 'few', 'many', 'other'];
  const absent = [...referenced]
    .filter((k) => !k.includes('${')) // skip template-built keys
    .filter((k) => {
      const [ns, rest] = k.split(':');
      if (base[ns] === undefined) return true;
      if (valueAt(base[ns], rest) !== undefined) return false;
      return !PLURAL_SUFFIXES.some((sfx) => valueAt(base[ns], `${rest}_${sfx}`) !== undefined);
    });
  line(`${absent.length ? 'FAIL' : 'ok  '} referenced but absent from '${app.base}': ${absent.length}`);
  absent.slice(0, 8).forEach((k) => line(`       ${k}`));
  if (absent.length) hardFailures++;

  // 4. coverage
  const withStrings = files.filter((f) => hardcoded(f) > 0);
  const total = withStrings.reduce((a, f) => a + hardcoded(f), 0);
  line(`coverage: ${files.length - withStrings.length}/${files.length} files clean, ` +
       `~${total} strings still hardcoded in ${withStrings.length} files`);
  withStrings
    .map((f) => [relative(ROOT, f), hardcoded(f)])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .forEach(([f, n]) => line(`       ${String(n).padStart(4)}  ${f}`));
}

line(`\n${'='.repeat(64)}`);
line(hardFailures ? `${hardFailures} hard failure(s)` : 'no hard failures');
if (CI && hardFailures) process.exit(1);

#!/usr/bin/env node
/**
 * Run the extractor over a whole app and merge the result into its catalogue.
 *
 *   node tools/i18n-audit/extract-all.mjs mobile
 *   node tools/i18n-audit/extract-all.mjs web members fellowships
 *
 * Extra arguments limit the run to those namespaces, which keeps a batch small
 * enough to translate and review in one go.
 *
 * English is written straight into the base catalogue. The other languages are
 * left alone deliberately: they fall back to English until a translation is
 * written, and `audit.mjs` reports exactly which keys are waiting.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const app = process.argv[2];
const only = process.argv.slice(3);

const APPS = {
  mobile: { src: 'apps/mobile', locales: 'apps/mobile/locales' },
  web: { src: 'apps/web/src', locales: 'apps/web/locales' },
};
const cfg = APPS[app];
if (!cfg) {
  console.error('usage: extract-all.mjs <mobile|web> [namespace...]');
  process.exit(1);
}

/** Which namespace a file belongs to, by where it lives. */
function namespaceFor(file) {
  const p = relative(ROOT, file);
  const rules = [
    [/\/\(auth\)\/|\/login\b|\/register\b|\/forgot-password\b|\/reset-password\b/, 'auth'],
    [/\/reports?\b/, 'reports'],
    [/\/members?\b/, 'members'],
    [/\/membership\b/, 'membership'],
    [/\/fellowships?\b/, 'fellowships'],
    [/\/departments?\b/, 'departments'],
    [/\/new-believers\b/, 'newBelievers'],
    [/\/souls(-dashboard)?\b/, 'souls'],
    [/\/outreach\b/, 'outreach'],
    [/\/rota-admin\b|\/rota\b/, 'rota'],
    [/\/attendance\b|\/rollcall\b|\/check-in\b/, 'attendance'],
    [/\/forms?\b/, 'forms'],
    [/\/branches\b|my-branch/, 'branches'],
    [/\/admin\b|\/regions\b/, 'admin'],
    [/\/security\b|\/privacy|\/consent|\/data-privacy|\/recent-activity/, 'security'],
    [/\/settings\b|appearance|language|\/profile\b|notification/, 'settings'],
    [/\/concerns\b|\/follow-ups\b/, 'concerns'],
    [/\/community\b/, 'community'],
    [/\/components?\//, 'common'],
  ];
  for (const [re, ns] of rules) if (re.test(p)) return ns;
  return 'common';
}

const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    if (['node_modules', '.expo', '.next'].includes(e)) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (extname(p) === '.tsx' && !/\.(test|spec)\./.test(e)) out.push(p);
  }
  return out;
};

const files = walk(join(ROOT, cfg.src)).filter((f) => !only.length || only.includes(namespaceFor(f)));
const basePath = join(ROOT, cfg.locales, 'en.json');
const base = JSON.parse(readFileSync(basePath, 'utf8'));

let touched = 0;
let added = 0;
const perNs = {};

/**
 * useTranslation is a hook, so it only works in a client component. Rewriting
 * a Next.js server component to call it would break the build, so for `web`
 * we extract only from files carrying the 'use client' directive and report
 * the rest. Mobile has no such split.
 */
function isTranslatable(file) {
  if (app !== 'web') return true;
  return /^\s*(['"])use client\1/.test(readFileSync(file, 'utf8'));
}

const skipped = [];
const collisions = [];

for (const file of files) {
  if (!isTranslatable(file)) {
    skipped.push(relative(ROOT, file));
    continue;
  }
  const ns = namespaceFor(file);
  let result;
  try {
    result = JSON.parse(
      execFileSync('python3', [join(ROOT, 'tools/i18n-audit/extract.py'), file, ns]).toString(),
    );
  } catch (err) {
    console.log(`  ! ${relative(ROOT, file)}: ${String(err).slice(0, 80)}`);
    continue;
  }
  if (result.__error__) {
    console.log(`  ! ${relative(ROOT, file)}: ${result.__error__}`);
    continue;
  }
  const keys = Object.keys(result);
  if (!keys.length) continue;

  base[ns] ??= {};
  for (const [k, v] of Object.entries(result)) {
    if (base[ns][k] === undefined) {
      base[ns][k] = v;
      added++;
    } else if (base[ns][k] !== v) {
      // The generated key already exists holding different English. Keeping
      // the catalogue value silently rewords the screen -- this is how a
      // "Retry" button started reading "Try again". Report it; the key or the
      // wording has to be reconciled by hand.
      collisions.push(`${ns}.${k}: catalogue has ${JSON.stringify(base[ns][k])}, ${relative(ROOT, file)} said ${JSON.stringify(v)}`);
    }
  }
  touched++;
  perNs[ns] = (perNs[ns] ?? 0) + keys.length;
  console.log(`  ${String(keys.length).padStart(3)}  ${ns.padEnd(12)} ${relative(ROOT, file)}`);
}

writeFileSync(basePath, `${JSON.stringify(base, null, 2)}\n`);
console.log(`\n${touched} files rewritten, ${added} new keys in ${cfg.locales}/en.json`);
console.log(Object.entries(perNs).map(([n, c]) => `  ${n}: ${c}`).join('\n'));
if (collisions.length) {
  console.log(`\n${collisions.length} key collision(s) -- the English text on screen has changed:`);
  for (const c of collisions) console.log(`  ! ${c}`);
}
if (skipped.length) {
  console.log(`\n${skipped.length} server components skipped (no 'use client'):`);
  for (const f of skipped) console.log(`  ${f}`);
}

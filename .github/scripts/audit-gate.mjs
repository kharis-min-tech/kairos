#!/usr/bin/env node
// Dependency vulnerability gate.
//
// Why this is not just `npm audit --audit-level=high`:
//
// A plain threshold gate cannot pass in this repo today. `npm audit` returns 93
// advisories (5 critical), and the criticals are structural rather than
// negligent — `next` is on the newest 15.x while the advisory range runs through
// 16.3, and `@cloudflare/next-on-pages` (which pins us to Next 15) is itself
// flagged with no fix available. `--omit=dev` does not help either: in this
// monorepo the Expo/EAS toolchain (sharp, node-forge, xcode, expo-router) sits
// in `dependencies` of apps/mobile, so omitting dev drops the count to 47
// without actually isolating code we deploy.
//
// A gate that is red on day one gets switched off in a week. So instead of
// weakening the threshold until it passes, this gate holds the line at
// high+critical and compares against a committed baseline of advisories we have
// already seen and accepted. It is green today and goes red the moment a NEW
// high or critical advisory enters the tree — which is the regression we
// actually want CI to catch.
//
// The baseline is a debt register, not an amnesty: every entry is something to
// drive to zero. Shrink it, never pad it.
//
// Usage:
//   node .github/scripts/audit-gate.mjs            # gate (exit 1 on new advisories)
//   node .github/scripts/audit-gate.mjs --update   # rewrite the baseline from the current tree
//
// Env:
//   AUDIT_LEVEL   low | moderate | high | critical   (default: high)

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SEVERITY_ORDER = ['info', 'low', 'moderate', 'high', 'critical'];

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const baselinePath = resolve(repoRoot, '.github', 'npm-audit-baseline.json');

const threshold = (process.env.AUDIT_LEVEL ?? 'high').toLowerCase();
if (!SEVERITY_ORDER.includes(threshold)) {
  console.error(`AUDIT_LEVEL must be one of ${SEVERITY_ORDER.join(', ')} — got "${threshold}"`);
  process.exit(2);
}
const thresholdRank = SEVERITY_ORDER.indexOf(threshold);
const updating = process.argv.includes('--update');

// `npm audit` exits non-zero whenever it finds anything at or above the default
// audit level, so a non-zero exit is expected and is not an error. Only a
// missing/unparseable payload is.
function runAudit() {
  let stdout;
  try {
    stdout = execFileSync('npm', ['audit', '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    stdout = error.stdout;
    if (!stdout) {
      console.error('npm audit produced no output.');
      console.error(error.stderr || error.message);
      process.exit(2);
    }
  }
  try {
    return JSON.parse(stdout);
  } catch {
    console.error('Could not parse `npm audit --json` output:');
    console.error(stdout.slice(0, 2000));
    process.exit(2);
  }
}

// One advisory can surface on many packages and many paths. Collapse to the
// GHSA id so the baseline is a list of *advisories*, not of tree positions —
// otherwise a lockfile reshuffle looks like a new vulnerability.
function collectAdvisories(report) {
  const found = new Map();
  for (const [name, node] of Object.entries(report.vulnerabilities ?? {})) {
    if (SEVERITY_ORDER.indexOf(node.severity) < thresholdRank) continue;
    for (const via of node.via ?? []) {
      if (typeof via !== 'object' || !via.url) continue; // string `via` = "depends on vulnerable X"
      const id = via.url.split('/').pop();
      if (!id?.startsWith('GHSA-')) continue;
      if (!found.has(id)) {
        found.set(id, {
          id,
          severity: via.severity ?? node.severity,
          title: via.title ?? '(no title)',
          modules: new Set(),
        });
      }
      found.get(id).modules.add(via.name ?? name);
    }
  }
  return found;
}

const report = runAudit();
const counts = report.metadata?.vulnerabilities ?? {};
const found = collectAdvisories(report);

console.log(
  `npm audit totals: ${Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([sev, n]) => `${n} ${sev}`)
    .join(', ') || 'none'}`,
);
console.log(`Gate threshold: ${threshold}+ — ${found.size} distinct advisories at or above it.\n`);

if (updating) {
  const accepted = [...found.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((a) => ({
      id: a.id,
      severity: a.severity,
      modules: [...a.modules].sort(),
      title: a.title,
    }));
  writeFileSync(
    baselinePath,
    `${JSON.stringify(
      {
        $comment: [
          'Known high/critical npm advisories accepted as debt, so CI can gate on NEW ones.',
          'Regenerate with: node .github/scripts/audit-gate.mjs --update',
          'This is a debt register. Shrink it; do not pad it to make CI green.',
          'EVERY CRITICAL IN THIS FILE NEEDS A REACHABILITY NOTE in',
          'docs/security/secure-sdlc.md "The accepted criticals" — an auditor reading',
          '"unauthenticated RCE, accepted" with no rationale will rightly escalate it.',
          'This array is regenerated, so write the rationale in that document, not here.',
        ],
        threshold,
        generated: new Date().toISOString().slice(0, 10),
        accepted,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Wrote ${accepted.length} advisories to .github/npm-audit-baseline.json`);
  process.exit(0);
}

let baseline;
try {
  baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
} catch (error) {
  console.error(`Could not read .github/npm-audit-baseline.json — ${error.message}`);
  console.error('Generate it with: node .github/scripts/audit-gate.mjs --update');
  process.exit(2);
}

const acceptedIds = new Set((baseline.accepted ?? []).map((a) => a.id));
const regressions = [...found.values()].filter((a) => !acceptedIds.has(a.id));
const fixed = [...acceptedIds].filter((id) => !found.has(id));

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

if (fixed.length) {
  console.log(
    `${plural(fixed.length, 'baselined advisory is', 'baselined advisories are')} no longer ` +
      `present. Trim from the baseline:\n${fixed.map((id) => `  - ${id}`).join('\n')}\n`,
  );
}

if (!regressions.length) {
  console.log(`No new ${threshold}+ advisories beyond the ${acceptedIds.size} baselined. Gate passed.`);
  process.exit(0);
}

console.error(
  `NEW ${threshold}+ ${plural(regressions.length, 'advisory', 'advisories')} not in the baseline:\n`,
);
for (const a of regressions.sort((x, y) => y.severity.localeCompare(x.severity))) {
  console.error(`  [${a.severity}] ${a.id}  (${[...a.modules].sort().join(', ')})`);
  console.error(`      ${a.title}`);
  console.error(`      https://github.com/advisories/${a.id}\n`);
}
console.error('Fix the advisory, or — if it is genuinely not exploitable here — record it with');
console.error('`node .github/scripts/audit-gate.mjs --update` and say why in the PR.');
process.exit(1);

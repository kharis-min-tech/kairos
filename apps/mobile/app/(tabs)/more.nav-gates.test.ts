/**
 * Every nav row that points at a guarded page must carry its own gate.
 *
 * Found during pre-pilot testing: a plain member saw "Dormant attendees" and
 * "Form submissions" in the More tab, tapped them, and was redirected home.
 * Both destinations call `useRequireCapability`; neither row was gated. The
 * rows that were gated (Concerns, Check-in desk) happened to sit inside a
 * ternary somebody remembered to write.
 *
 * So this is a source-level check rather than a render test: the bug is not in
 * what a component does, it is in a pairing between two files that nothing
 * enforced. Adding a route with a guard and forgetting the row is the exact
 * mistake, and it is invisible until somebody without the capability taps it.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const APP_DIR = join(__dirname, '..');
const MORE_TSX = join(__dirname, 'more.tsx');

/** Each `<NavRow …/>` in the More tab, with its label, destination and gate. */
function navRows() {
  const src = readFileSync(MORE_TSX, 'utf8');
  const rows: { label: string; dest: string; gated: boolean; wrapped: boolean }[] = [];
  const re = /<NavRow\b([\s\S]*?)\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const body = m[1]!;
    const label = /label="([^"]+)"/.exec(body)?.[1];
    const dest = /router\.push\(\s*['"`]([^'"`]+)['"`]/.exec(body)?.[1];
    if (!label || !dest) continue;
    // Gated either by the declarative prop or by a conditional around it.
    const gated = /\bshow=\{/.test(body);
    const before = src.slice(Math.max(0, m.index - 220), m.index);
    const wrapped = /\?\s*\(\s*$/.test(before.trimEnd()) || /&&\s*\(\s*$/.test(before.trimEnd());
    rows.push({ label, dest, gated, wrapped });
  }
  return rows;
}

/** The screen a destination resolves to, if it exists in the app tree. */
function pageFor(dest: string): string | null {
  const clean = dest.split('?')[0]!.replace(/^\//, '');
  for (const candidate of [`${clean}.tsx`, `${clean}/index.tsx`]) {
    const p = join(APP_DIR, candidate);
    if (existsSync(p)) return p;
  }
  return null;
}

describe('More tab nav gates', () => {
  it('finds the nav rows at all, so the test cannot pass by parsing nothing', () => {
    const rows = navRows();
    expect(rows.length).toBeGreaterThan(15);
    expect(rows.map((r) => r.label)).toContain('Dormant attendees');
  });

  it('never offers a row whose destination refuses the caller', () => {
    const offenders = navRows()
      .filter((row) => {
        const page = pageFor(row.dest);
        if (!page) return false;
        const guarded = readFileSync(page, 'utf8').includes('useRequireCapability');
        return guarded && !row.gated && !row.wrapped;
      })
      .map((r) => `"${r.label}" -> ${r.dest}`);

    if (offenders.length > 0) {
      throw new Error(
        'These rows point at pages that call useRequireCapability but are ' +
          'shown to everyone, so the caller is redirected on tap. Give each ' +
          "one show={…} matching the page's own rule:\n  " +
          offenders.join('\n  '),
      );
    }
    expect(offenders).toEqual([]);
  });
});

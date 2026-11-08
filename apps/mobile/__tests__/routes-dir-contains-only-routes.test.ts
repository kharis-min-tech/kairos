/**
 * `app/` is a filesystem router, not a source folder. expo-router sweeps the
 * whole directory into the bundle via `require.context`, so every file in it
 * ships to the device whether or not a route points at it.
 *
 * That bit us: four test files had accumulated inside `app/`. Three imported
 * `@testing-library/react-native` — a devDependency — and bundled silently,
 * shipping test code in every release for weeks. The fourth imported
 * `node:fs`, which Metro cannot polyfill, and took the iOS build down with
 * "Unable to resolve module node:fs". The loud failure was the lucky one.
 *
 * So this is a source-level check rather than a behavioural one: the defect is
 * a file being in the wrong directory, which no render test can see. Tests for
 * a screen live in `__tests__/` and import it by path.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const APP_DIR = join(__dirname, '..', 'app');

/** Every file under `app/`, recursively, relative to `app/`. */
function filesUnderApp(dir = APP_DIR, prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...filesUnderApp(join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out;
}

describe('app/ contains only routes', () => {
  it('walks the route tree at all, so the test cannot pass by finding nothing', () => {
    const files = filesUnderApp();
    expect(files.length).toBeGreaterThan(50);
    expect(files).toContain('(tabs)/more.tsx');
  });

  it('ships no test file to the device', () => {
    const offenders = filesUnderApp().filter((f) => /\.(test|spec)\.[tj]sx?$/.test(f));

    if (offenders.length > 0) {
      throw new Error(
        'These test files live under app/, so expo-router will bundle them ' +
          'into the shipped app and Metro will try to resolve their test-only ' +
          'imports. Move each to apps/mobile/__tests__/ and import the screen ' +
          'by path instead:\n  ' +
          offenders.join('\n  '),
      );
    }
    expect(offenders).toEqual([]);
  });
});

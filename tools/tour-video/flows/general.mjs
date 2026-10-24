import { ACCOUNTS } from './index.mjs';

/**
 * The general tour: what Kairos is, for somebody who has just been given an
 * account and does not yet know which parts are theirs.
 *
 * Recorded as an administrator, because the point of this one is the shape of
 * the whole platform. The role tours show what each person actually sees.
 *
 * Each stop shows its screen being used rather than standing on it; the
 * stops whose narration describes what is inside a group or a team open one.
 */
const stop = (n, title, path, run) => ({ n, title, async run(k) { await k.goto(path); await run(k); } });

export default {
  id: 'general',
  account: ACCOUNTS.admin,
  stops: [
    stop(1, 'Your overview', '/dashboard', (k) => k.showcase(8200)),
    {
      n: 2,
      title: 'The sidebar',
      // This stop is about the navigation itself, so the cursor walks it
      // rather than going anywhere.
      async run(k) {
        await k.moveTo('a[href="/dashboard"]');
        await k.showcase(7400);
      },
    },
    stop(3, 'Members', '/members', (k) => k.showcase(8600)),
    // "K-Groups, Kharis Express, New Breeds and the rest, with who leads
    // each one" — the types are a filter, so press one.
    stop(4, 'Fellowships', '/fellowships', async (k) => {
      await k.clickText(/k-?group|express|new breed/i);
      await k.showcase(6400);
    }),
    // "Each one keeps its own roster, its serving rota and…"
    stop(5, 'Departments', '/departments', async (k) => {
      await k.openFirst();
      await k.showcase(6000);
    }),
    stop(6, 'Attendance', '/attendance', (k) => k.showcase(8200)),
    stop(7, 'The souls pipeline', '/souls', (k) => k.showcase(8600)),
    stop(8, 'Reports', '/reports', (k) => k.showcase(9000)),
    stop(9, 'Your language', '/dashboard', (k) => k.showcase(7800)),
  ],
};

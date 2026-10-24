import { ACCOUNTS } from './index.mjs';

/**
 * The member tour: the short sidebar, and why it is short.
 *
 * Each stop shows its screen being used rather than standing on it. The two
 * stops that describe what is inside a group or a team open one.
 */
const stop = (n, title, path, run) => ({ n, title, async run(k) { await k.goto(path); await run(k); } });

export default {
  id: 'member',
  account: ACCOUNTS.member,
  stops: [
    stop(1, 'Your overview', '/dashboard', (k) => k.showcase(8200)),
    {
      n: 2,
      title: 'What you can see',
      // No navigation: this stop is about the sidebar itself, so the cursor
      // walks it rather than opening anything.
      async run(k) {
        await k.moveTo('a[href="/dashboard"]');
        await k.showcase(7400);
      },
    },
    stop(3, 'Your attendance', '/me/attendance', (k) => k.showcase(8600)),
    // "Fellowships shows the group you belong to, when it meets and where."
    stop(4, 'Your fellowship', '/fellowships', async (k) => {
      await k.openFirst();
      await k.showcase(6000);
    }),
    // "Departments lists the teams you serve on, when you are next on the
    // rota, and the uniform…"
    stop(5, 'Your departments', '/departments', async (k) => {
      await k.openFirst();
      await k.showcase(6000);
    }),
    stop(6, 'Checking in', '/attendance/check-in', (k) => k.showcase(8200)),
    stop(7, 'Forms', '/forms', (k) => k.showcase(8200)),
    stop(8, 'Your profile', '/profile', (k) => k.showcase(8200)),
  ],
};

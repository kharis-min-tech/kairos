import { ACCOUNTS } from './index.mjs';

/**
 * The pastor tour: one branch, and the pastoral work inside it.
 *
 * As with the other role tours, each stop now shows its screen being used
 * rather than standing on it, and the stops whose narration describes
 * opening a group or a team open one.
 */
const stop = (n, title, path, run) => ({ n, title, async run(k) { await k.goto(path); await run(k); } });

export default {
  id: 'pastor',
  account: ACCOUNTS.pastor,
  stops: [
    stop(1, 'Your overview', '/dashboard', (k) => k.showcase(8200)),
    stop(2, 'Your branch', '/my-branch', (k) => k.showcase(8200)),
    stop(3, 'The directory', '/members', (k) => k.showcase(8600)),
    stop(4, 'Follow-ups', '/follow-ups', (k) => k.showcase(8600)),
    stop(5, 'Concerns', '/concerns', (k) => k.showcase(8200)),
    // "For the fellowship you lead you can take the register, log a
    // follow-up, and see who has stopped coming." All of that is inside one.
    stop(6, 'Your fellowship', '/fellowships', async (k) => {
      await k.openFirst();
      await k.showcase(6000);
    }),
    // "For your department you manage the roster, publish the rota…"
    stop(7, 'Your department', '/departments', async (k) => {
      await k.openFirst();
      await k.showcase(6000);
    }),
    stop(8, 'The souls pipeline', '/souls', (k) => k.showcase(8200)),
    stop(9, 'Reports', '/reports', (k) => k.showcase(9000)),
  ],
};

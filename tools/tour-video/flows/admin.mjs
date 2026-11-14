import { ACCOUNTS } from './index.mjs';

/**
 * The administrator tour: the parts of Kairos that only an administrator has.
 *
 * Deliberately *not* a walk of the main sections — the general tour already
 * does that, and repeating it under a different account produced two clips
 * that were the same film. This one goes where a member or a pastor cannot:
 * branches, regions, the approval queue, who holds which grant, the
 * church-wide membership programme, and cross-branch reporting.
 *
 * Every stop used to be `goto` then `settle` — a page loaded, and then five
 * seconds of nothing while the line played over it. `showcase` spends that
 * time moving instead, and the two stops whose narration says "open a
 * branch" and "open a member" now actually open one.
 */
const stop = (n, title, path, run) => ({ n, title, async run(k) { await k.goto(path); await run(k); } });

export default {
  id: 'admin',
  account: ACCOUNTS.admin,
  stops: [
    stop(1, 'Your overview', '/dashboard', (k) => k.showcase(8200)),
    stop(2, 'Branches', '/admin/branches', (k) => k.showcase(8600)),
    // "Open a branch to set its details and its leadership." So open one.
    stop(3, 'Inside a branch', '/admin/branches', async (k) => {
      if (!(await k.openFirst())) await k.goto('/my-branch');
      await k.showcase(6400);
    }),
    stop(4, 'Regions', '/admin/regions', (k) => k.showcase(8200)),
    stop(5, 'The approval queue', '/members/approval', (k) => k.showcase(8600)),
    // "Open a member to manage their grants."
    stop(6, 'Who holds what', '/members', async (k) => {
      await k.openFirst();
      await k.showcase(6400);
    }),
    stop(7, 'Membership classes', '/membership', (k) => k.showcase(8600)),
    stop(8, 'Reports across branches', '/reports', (k) => k.showcase(9000)),
    stop(9, 'Your language', '/dashboard', (k) => k.showcase(7800)),
  ],
};

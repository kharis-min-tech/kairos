import { ACCOUNTS } from './index.mjs';

/**
 * The pastor and leader tour: everything a member sees, plus the branch.
 *
 * Recorded as somebody holding branch and group leadership rather than as an
 * administrator, so the sidebar stops where a pastor's actually stops.
 */
export default {
  id: 'pastor',
  account: ACCOUNTS.pastor,
  stops: [
    { n: 1, title: 'Your overview', async run(k) { await k.goto('/dashboard'); await k.settle(5200); } },
    { n: 2, title: 'Your branch', async run(k) { await k.goto('/my-branch'); await k.settle(5200); } },
    { n: 3, title: 'The directory', async run(k) { await k.goto('/members'); await k.settle(5600); } },
    { n: 4, title: 'Follow-ups', async run(k) { await k.goto('/follow-ups'); await k.settle(5600); } },
    { n: 5, title: 'Concerns', async run(k) { await k.goto('/concerns'); await k.settle(5200); } },
    { n: 6, title: 'Your fellowship', async run(k) { await k.goto('/fellowships'); await k.settle(5200); } },
    { n: 7, title: 'Your department', async run(k) { await k.goto('/departments'); await k.settle(5200); } },
    { n: 8, title: 'The souls pipeline', async run(k) { await k.goto('/souls'); await k.settle(5200); } },
    { n: 9, title: 'Reports', async run(k) { await k.goto('/reports'); await k.settle(6000); } },
  ],
};

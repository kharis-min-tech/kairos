import { ACCOUNTS } from './index.mjs';

/**
 * The member tour: what somebody with no grants at all actually sees.
 *
 * Recorded as a real member rather than an administrator pretending. Most of
 * the sidebar is simply not there for them, and that absence is the point of
 * the tour.
 */
export default {
  id: 'member',
  account: ACCOUNTS.member,
  stops: [
    { n: 1, title: 'Your overview', async run(k) { await k.goto('/dashboard'); await k.settle(5200); } },
    { n: 2, title: 'What you can see', async run(k) { await k.moveTo('a[href="/dashboard"]'); await k.settle(4800); } },
    { n: 3, title: 'Your attendance', async run(k) { await k.goto('/me/attendance'); await k.settle(5600); } },
    { n: 4, title: 'Your fellowship', async run(k) { await k.goto('/fellowships'); await k.settle(5200); } },
    { n: 5, title: 'Your departments', async run(k) { await k.goto('/departments'); await k.settle(5200); } },
    { n: 6, title: 'Checking in', async run(k) { await k.goto('/attendance/check-in'); await k.settle(5200); } },
    { n: 7, title: 'Forms', async run(k) { await k.goto('/forms'); await k.settle(5200); } },
    { n: 8, title: 'Your profile', async run(k) { await k.goto('/profile'); await k.settle(5200); } },
  ],
};

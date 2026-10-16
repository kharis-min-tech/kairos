import { ACCOUNTS } from './index.mjs';

/**
 * The administrator tour: what Kairos is, for somebody who has just been given an
 * account and does not yet know which parts are theirs.
 *
 * Recorded as an administrator, because the point of this one is the shape of
 * the whole platform. The role tours show what each person actually sees.
 */
export default {
  id: 'admin',
  account: ACCOUNTS.admin,
  stops: [
    {
      n: 1,
      title: 'Your overview',
      async run(k) {
        await k.goto('/dashboard');
        await k.settle(5200);
      },
    },
    {
      n: 2,
      title: 'The sidebar',
      async run(k) {
        // The sidebar groups collapse, so point at the Overview link, which
        // is always rendered, rather than one that may be inside a closed group.
        await k.moveTo('a[href="/dashboard"]');
        await k.settle(4800);
      },
    },
    {
      n: 3,
      title: 'Members',
      async run(k) {
        await k.goto('/members');
        await k.settle(5600);
      },
    },
    {
      n: 4,
      title: 'Fellowships',
      async run(k) {
        await k.goto('/fellowships');
        await k.settle(5600);
      },
    },
    {
      n: 5,
      title: 'Departments',
      async run(k) {
        await k.goto('/departments');
        await k.settle(5200);
      },
    },
    {
      n: 6,
      title: 'Attendance',
      async run(k) {
        await k.goto('/attendance');
        await k.settle(5200);
      },
    },
    {
      n: 7,
      title: 'The souls pipeline',
      async run(k) {
        await k.goto('/souls');
        await k.settle(5600);
      },
    },
    {
      n: 8,
      title: 'Reports',
      async run(k) {
        await k.goto('/reports');
        await k.settle(6000);
      },
    },
    {
      n: 9,
      title: 'Your language',
      async run(k) {
        await k.goto('/dashboard');
        await k.settle(4800);
      },
    },
  ],
};

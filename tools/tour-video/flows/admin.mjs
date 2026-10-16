import { ACCOUNTS } from './index.mjs';

/**
 * The administrator tour: the parts of Kairos that only an administrator has.
 *
 * Deliberately *not* a walk of the main sections — the general tour already
 * does that, and repeating it under a different account produced two clips
 * that were the same film. This one goes where a member or a pastor cannot:
 * branches, regions, the approval queue, who holds which grant, the
 * church-wide membership programme, and cross-branch reporting.
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
      title: 'Branches',
      async run(k) {
        await k.goto('/admin/branches');
        await k.settle(5600);
      },
    },
    {
      n: 3,
      title: 'Inside a branch',
      async run(k) {
        await k.goto('/my-branch');
        await k.settle(5600);
      },
    },
    {
      n: 4,
      title: 'Regions',
      async run(k) {
        await k.goto('/admin/regions');
        await k.settle(5200);
      },
    },
    {
      n: 5,
      title: 'The approval queue',
      async run(k) {
        await k.goto('/members/approval');
        await k.settle(5600);
      },
    },
    {
      n: 6,
      title: 'Who holds what',
      async run(k) {
        await k.goto('/members');
        await k.settle(5600);
      },
    },
    {
      n: 7,
      title: 'Membership classes',
      async run(k) {
        await k.goto('/membership');
        await k.settle(5600);
      },
    },
    {
      n: 8,
      title: 'Reports across branches',
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

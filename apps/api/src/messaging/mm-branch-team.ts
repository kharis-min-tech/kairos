/**
 * Resolves the Mattermost team ID for a branch.
 *
 * Looks up `branches.mattermostTeamId`. If it isn't set yet, calls
 * `mmGetOrCreateTeam` to provision the team, persists the ID back into the
 * `branches` row, then returns it.
 *
 * Safe to call concurrently — worst case creates one duplicate attempt which
 * Mattermost deduplicates by name.
 */

import { eq } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { branches } from '@kairos/database';
import { mmGetOrCreateTeam, mmAddUserToTeam, branchTeamName } from '@kairos/utils';

export { mmAddUserToTeam };

export async function getOrCreateBranchTeamId(
  db: Database,
  branchId: string,
): Promise<string | null> {
  try {
    const [branch] = await db
      .select({ mattermostTeamId: branches.mattermostTeamId, branchName: branches.branchName })
      .from(branches)
      .where(eq(branches.id, branchId));

    if (!branch) return null;

    if (branch.mattermostTeamId) return branch.mattermostTeamId;

    // Team not yet provisioned — create it now
    const teamId = await mmGetOrCreateTeam(
      branchTeamName(branchId, branch.branchName),
      branch.branchName,
    );

    if (teamId) {
      await db
        .update(branches)
        .set({ mattermostTeamId: teamId, updatedAt: new Date() })
        .where(eq(branches.id, branchId));
    }

    return teamId;
  } catch {
    return null;
  }
}

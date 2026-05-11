/**
 * Pure rota fairness algorithm — no DB / IO. Easy to unit test.
 *
 * Goal: distribute slot assignments fairly across a pool of members.
 * - Each pool member has an optional `lastScheduledAt` date and a positive `weight`.
 * - For each service date and each slot, pick `positionsRequired` members.
 * - A member cannot be assigned to two slots on the same date (unique per instance).
 * - Lower `lastScheduledAt` (or null) wins (least-recently-scheduled first).
 * - Higher `weight` is a tiebreaker (weight reflects willingness to serve more often).
 * - Stable secondary tiebreaker by `memberId` for determinism.
 */

export interface FairnessPoolMember {
  memberId: string;
  weight: number;
  lastScheduledAt: string | null; // YYYY-MM-DD or null
  preferredRoleName?: string | null;
}

export interface FairnessSlot {
  slotId: string;
  roleName: string;
  positionsRequired: number;
  sortOrder: number;
}

export interface PlannedAssignment {
  serviceDate: string;
  slotId: string;
  memberId: string | null; // null => slot left open (insufficient pool)
}

/** Compare for fairness ordering; returns negative if `a` should be picked before `b`. */
function compareFairness(a: FairnessPoolMember, b: FairnessPoolMember): number {
  // null lastScheduledAt is "earliest" → wins
  const aDate = a.lastScheduledAt ?? '0000-00-00';
  const bDate = b.lastScheduledAt ?? '0000-00-00';
  if (aDate !== bDate) return aDate < bDate ? -1 : 1;
  // higher weight wins
  if (a.weight !== b.weight) return b.weight - a.weight;
  // deterministic tiebreaker
  return a.memberId < b.memberId ? -1 : 1;
}

/**
 * Generates the list of upcoming service dates (YYYY-MM-DD) for a weekly template.
 * `startDate` is the first date to consider; the first service date is the next
 * occurrence of `weekday` on or after `startDate`.
 *
 * @param startDate ISO YYYY-MM-DD
 * @param weekday   0 (Sunday) – 6 (Saturday)
 * @param weeks     number of consecutive weekly occurrences
 */
export function computeServiceDates(startDate: string, weekday: number, weeks: number): string[] {
  if (weeks < 1) return [];
  // Parse as UTC to avoid timezone drift
  const [y, m, d] = startDate.split('-').map(Number);
  const start = new Date(Date.UTC(y!, (m! - 1), d!));
  const startDow = start.getUTCDay();
  const offset = (weekday - startDow + 7) % 7;
  const first = new Date(start);
  first.setUTCDate(start.getUTCDate() + offset);

  const dates: string[] = [];
  for (let i = 0; i < weeks; i++) {
    const d2 = new Date(first);
    d2.setUTCDate(first.getUTCDate() + i * 7);
    dates.push(d2.toISOString().slice(0, 10));
  }
  return dates;
}

/**
 * Plans assignments for a set of service dates given slots and a pool.
 *
 * - Mutates an internal copy of `lastScheduledAt` so the same member isn't
 *   immediately picked again for subsequent dates.
 * - Within a single date, a member is never picked for two different slots.
 * - If pool is exhausted for a slot, that position is left as `memberId: null`.
 * - Slots with a `preferredRoleName` matching `roleName` get priority for that
 *   slot (still ordered by fairness within the preferred subset).
 */
export function planAssignments(
  pool: FairnessPoolMember[],
  slots: FairnessSlot[],
  serviceDates: string[],
): PlannedAssignment[] {
  // Working copy of pool with mutable lastScheduledAt
  const working = pool.map((p) => ({ ...p }));
  const sortedSlots = [...slots].sort((a, b) =>
    a.sortOrder !== b.sortOrder ? a.sortOrder - b.sortOrder : a.slotId < b.slotId ? -1 : 1,
  );

  const planned: PlannedAssignment[] = [];

  for (const date of serviceDates) {
    const usedThisDate = new Set<string>();
    for (const slot of sortedSlots) {
      // Build candidate list: members not yet assigned today, sorted by fairness
      // with a preference boost for those whose preferredRoleName matches.
      const candidates = working.filter((p) => !usedThisDate.has(p.memberId));
      const preferred = candidates.filter((p) => p.preferredRoleName === slot.roleName);
      const others = candidates.filter((p) => p.preferredRoleName !== slot.roleName);
      preferred.sort(compareFairness);
      others.sort(compareFairness);
      const ordered = [...preferred, ...others];

      for (let pos = 0; pos < slot.positionsRequired; pos++) {
        const pick = ordered[pos];
        if (!pick) {
          planned.push({ serviceDate: date, slotId: slot.slotId, memberId: null });
          continue;
        }
        usedThisDate.add(pick.memberId);
        // Update lastScheduledAt in-place on working copy
        const wp = working.find((p) => p.memberId === pick.memberId)!;
        wp.lastScheduledAt = date;
        planned.push({ serviceDate: date, slotId: slot.slotId, memberId: pick.memberId });
      }
    }
  }

  return planned;
}

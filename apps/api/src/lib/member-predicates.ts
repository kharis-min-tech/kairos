import { isNotNull, type SQL } from 'drizzle-orm';
import { members } from '@kairos/database';

/**
 * The canonical "is this row a confirmed Member?" predicate.
 *
 * Per docs/domain-model.md §0, "Member" in this church means the person
 * completed the 4-week membership class. The truth lives in
 * `members.membership_class_completed_at` (introduced in Task #33 P1):
 *   - NULL  → not yet a confirmed Member (visitor / attendee / child)
 *   - SET   → confirmed Member, stamped at the class completion date
 *
 * Use this helper anywhere a query needs to filter the directory roll, the
 * Member-growth chart, or any other surface that semantically means
 * "confirmed Members only." Do NOT inline `isNotNull(members.membership...)`
 * at new call sites — the helper is the single point of truth so a future
 * refinement (e.g. tightening the predicate, adding an active-only check)
 * is a one-line change across the codebase.
 */
export function isRealMember(): SQL {
  return isNotNull(members.membershipClassCompletedAt);
}

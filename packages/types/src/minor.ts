import { ageInYears } from './form-engine';
import { MemberType } from './enums';

/**
 * Age (in whole years) below which a member is treated as a protected minor.
 * The product line is **16** (the first-timer form's "under 16 / attends with a
 * guardian" question), not 18 — see the U16 data-protection feature. Named
 * `MINOR_AGE_THRESHOLD` rather than anything with "18" in it on purpose.
 */
export const MINOR_AGE_THRESHOLD = 16;

/** The subset of member fields needed to decide minor status. */
export interface MinorCheckInput {
  memberType?: string | null;
  dateOfBirth?: string | Date | null;
}

/**
 * True when a member is a protected minor: either explicitly typed `'child'`,
 * or their date of birth implies an age under {@link MINOR_AGE_THRESHOLD}.
 *
 * This is the single gate the minor-data-protection rules key off — record
 * redaction, the health-record surface, and the minor-login block all call it.
 * `now` is injectable for testability; defaults to the current date.
 */
export function isMinorMember(member: MinorCheckInput, now: Date = new Date()): boolean {
  if (member.memberType === MemberType.Child) return true;
  if (member.dateOfBirth == null) return false;
  const age = ageInYears(member.dateOfBirth, now);
  return age !== null && age < MINOR_AGE_THRESHOLD;
}

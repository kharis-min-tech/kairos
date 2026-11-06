import {
  DepartmentJoinRequestStatus,
  FormSubmissionStatus,
} from './enums';
import { GiftAidStatus } from './gift-aid';
import type { MembershipInterestStatus } from './membership';

/**
 * Which status values are waiting on a person to do something.
 *
 * Colour in this app means attention, not category. A status set is mostly
 * history: it records what already happened and nobody can act on it. At most
 * one value in each set is a job somebody still owes, and that is the only
 * one worth a colour. Everything else reads in plain ink, including outcomes
 * that feel important, like a rejection, because an outcome is not a task.
 *
 * Keeping the judgement here rather than in each screen's style map is the
 * point: web and mobile render the same set the same way, and changing which
 * value counts as a job is one edit with one place to argue about it.
 */
export const STATUS_AWAITING_ACTION = {
  /** A new submission has not been triaged. The rest are triaged already. */
  formSubmission: [FormSubmissionStatus.New],
  /**
   * Applied needs a first look; interviewed owes the applicant a decision.
   * Offered and probation are waiting on somebody else or on the calendar,
   * and the four terminal values are history.
   */
  departmentJoinRequest: [
    DepartmentJoinRequestStatus.Applied,
    DepartmentJoinRequestStatus.Interviewed,
  ],
  /**
   * An invalid declaration usually means a missing or unusable address that
   * somebody has to chase, or a donor to confirm with. The status cannot tell
   * the fixable case from the dead one, so it is surfaced either way.
   */
  giftAid: [GiftAidStatus.Invalid],
  /** Waiting means nobody has admitted them to a cohort yet. */
  membershipInterest: ['waiting'] as MembershipInterestStatus[],
} as const;

export type StatusDomain = keyof typeof STATUS_AWAITING_ACTION;

/** True when this status is a job somebody still owes. */
export function isAwaitingAction(domain: StatusDomain, value: string): boolean {
  return (STATUS_AWAITING_ACTION[domain] as readonly string[]).includes(value);
}

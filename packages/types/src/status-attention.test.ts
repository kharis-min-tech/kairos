import { describe, it, expect } from 'vitest';
import { isAwaitingAction, STATUS_AWAITING_ACTION } from './status-attention';
import { DepartmentJoinRequestStatus, FormSubmissionStatus } from './enums';
import { GiftAidStatus, GIFT_AID_STATUS_VALUES } from './gift-aid';

describe('isAwaitingAction', () => {
  it('marks a new submission and nothing else in that set', () => {
    expect(isAwaitingAction('formSubmission', FormSubmissionStatus.New)).toBe(true);
    for (const v of [
      FormSubmissionStatus.Reviewed,
      FormSubmissionStatus.Converted,
      FormSubmissionStatus.Dismissed,
    ]) {
      expect(isAwaitingAction('formSubmission', v)).toBe(false);
    }
  });

  it('does not treat a terminal failure as a job', () => {
    // A rejection is history. Nobody is waiting on it, so it reads plain
    // even though it feels like the most important row on the screen.
    expect(isAwaitingAction('departmentJoinRequest', DepartmentJoinRequestStatus.Rejected)).toBe(false);
    expect(isAwaitingAction('departmentJoinRequest', DepartmentJoinRequestStatus.ProbationFailed)).toBe(false);
    expect(isAwaitingAction('departmentJoinRequest', DepartmentJoinRequestStatus.Withdrawn)).toBe(false);
  });

  it('marks the two points where a decision is owed', () => {
    expect(isAwaitingAction('departmentJoinRequest', DepartmentJoinRequestStatus.Applied)).toBe(true);
    expect(isAwaitingAction('departmentJoinRequest', DepartmentJoinRequestStatus.Interviewed)).toBe(true);
    // Offered waits on the applicant; probation waits on the calendar.
    expect(isAwaitingAction('departmentJoinRequest', DepartmentJoinRequestStatus.Offered)).toBe(false);
    expect(isAwaitingAction('departmentJoinRequest', DepartmentJoinRequestStatus.Probation)).toBe(false);
  });

  it('marks an invalid gift aid declaration, since somebody has to chase it', () => {
    expect(isAwaitingAction('giftAid', GiftAidStatus.Invalid)).toBe(true);
    expect(isAwaitingAction('giftAid', GiftAidStatus.Active)).toBe(false);
    expect(isAwaitingAction('giftAid', GiftAidStatus.Cancelled)).toBe(false);
  });

  it('leaves most of every set unmarked', () => {
    // The rule only works while the exception stays an exception. If a set
    // ever marks half its values, the colour has stopped meaning anything.
    for (const marked of Object.values(STATUS_AWAITING_ACTION)) {
      expect(marked.length).toBeLessThanOrEqual(2);
    }
    expect(STATUS_AWAITING_ACTION.giftAid.length).toBeLessThan(GIFT_AID_STATUS_VALUES.length);
  });

  it('returns false for a value that is not in the set at all', () => {
    expect(isAwaitingAction('formSubmission', 'nonsense')).toBe(false);
  });
});

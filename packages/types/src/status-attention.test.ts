import { describe, it, expect } from 'vitest';
import { isAwaitingAction, STATUS_AWAITING_ACTION } from './status-attention';
import {
  ContactStatus,
  DepartmentJoinRequestStatus,
  FormSubmissionStatus,
  RotaAssignmentStatus,
  RotaInstanceStatus,
  RotaSwapRequestStatus,
  SoulStatus,
} from './enums';
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

  it('marks the soul nobody has contacted, not the one being worked', () => {
    expect(isAwaitingAction('soul', SoulStatus.New)).toBe(true);
    // Following Up has an owner already; the rest are where it got to.
    for (const v of [
      SoulStatus.FollowingUp,
      SoulStatus.Interested,
      SoulStatus.Converted,
      SoulStatus.NotInterested,
      SoulStatus.LostContact,
    ]) {
      expect(isAwaitingAction('soul', v)).toBe(false);
    }
  });

  it('marks the two contact outcomes that owe a second attempt', () => {
    expect(isAwaitingAction('contactOutcome', ContactStatus.NoAnswer)).toBe(true);
    expect(isAwaitingAction('contactOutcome', ContactStatus.CallBackLater)).toBe(true);
    for (const v of [
      ContactStatus.Successful,
      ContactStatus.Interested,
      ContactStatus.WrongNumber,
      ContactStatus.NotInterested,
    ]) {
      expect(isAwaitingAction('contactOutcome', v)).toBe(false);
    }
  });

  it('marks the rota slots with nobody in them', () => {
    expect(isAwaitingAction('rotaAssignment', RotaAssignmentStatus.Open)).toBe(true);
    expect(isAwaitingAction('rotaAssignment', RotaAssignmentStatus.Declined)).toBe(true);
    for (const v of [
      RotaAssignmentStatus.Assigned,
      RotaAssignmentStatus.Confirmed,
      RotaAssignmentStatus.Swapped,
    ]) {
      expect(isAwaitingAction('rotaAssignment', v)).toBe(false);
    }
  });

  it('marks no rota instance status, including an unpublished draft', () => {
    // A draft is work the owner owes, but it is a different job from
    // filling a slot. Mixing the two into one mark makes neither legible.
    for (const v of Object.values(RotaInstanceStatus)) {
      expect(isAwaitingAction('rotaAssignment', v)).toBe(false);
    }
  });

  it('marks a swap request nobody has ruled on', () => {
    expect(isAwaitingAction('rotaSwapRequest', RotaSwapRequestStatus.Pending)).toBe(true);
    for (const v of [
      RotaSwapRequestStatus.Approved,
      RotaSwapRequestStatus.Rejected,
      RotaSwapRequestStatus.Cancelled,
    ]) {
      expect(isAwaitingAction('rotaSwapRequest', v)).toBe(false);
    }
  });

  it('keeps the swap request out of the rota assignment set', () => {
    // These were one colour map until the rule arrived: a pending swap was
    // rendered with the tone for 'Draft'. Two different sets, two domains.
    expect(isAwaitingAction('rotaAssignment', RotaSwapRequestStatus.Pending)).toBe(false);
    expect(isAwaitingAction('rotaSwapRequest', RotaAssignmentStatus.Open)).toBe(false);
  });

  it('leaves most of every set unmarked', () => {
    // The rule only works while the exception stays an exception. If a set
    // ever marks half its values, the colour has stopped meaning anything.
    for (const marked of Object.values(STATUS_AWAITING_ACTION)) {
      expect(marked.length).toBeLessThanOrEqual(2);
    }
    expect(STATUS_AWAITING_ACTION.giftAid.length).toBeLessThan(GIFT_AID_STATUS_VALUES.length);
    // Spelled out for the sets with a known total: fewer than half, so a
    // scan of the column still finds the exception rather than the rule.
    const half = (marked: readonly string[], all: Record<string, string>) =>
      expect(marked.length).toBeLessThan(Object.keys(all).length / 2);
    half(STATUS_AWAITING_ACTION.soul, SoulStatus);
    half(STATUS_AWAITING_ACTION.contactOutcome, ContactStatus);
    half(STATUS_AWAITING_ACTION.rotaAssignment, RotaAssignmentStatus);
    half(STATUS_AWAITING_ACTION.rotaSwapRequest, RotaSwapRequestStatus);
  });

  it('returns false for a value that is not in the set at all', () => {
    expect(isAwaitingAction('formSubmission', 'nonsense')).toBe(false);
  });
});

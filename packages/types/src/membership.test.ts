import { describe, it, expect } from 'vitest';
import {
  evaluateGraduationReadiness,
  type MembershipReadinessInput,
  type MembershipSessionRecord,
} from './membership';

type Rec = Pick<
  MembershipSessionRecord,
  'attended' | 'homeworkPassed' | 'quizPassed' | 'sessionNumber'
>;

function perfectRecords(): Rec[] {
  return [1, 2, 3, 4].map((n) => ({
    sessionNumber: n as Rec['sessionNumber'],
    attended: true,
    homeworkPassed: true,
    quizPassed: true,
  }));
}

function input(over: Partial<MembershipReadinessInput> = {}): MembershipReadinessInput {
  return {
    sessionCount: 4,
    records: perfectRecords(),
    finalTestPassed: true,
    finalTestTakenAt: '2026-06-10T10:00:00.000Z',
    finalTestDeadline: '2026-06-30',
    inductionAttended: true,
    ...over,
  };
}

describe('evaluateGraduationReadiness', () => {
  it('is eligible only when all six requirements are met', () => {
    const r = evaluateGraduationReadiness(input());
    expect(r.eligible).toBe(true);
    expect(r.outstanding).toEqual([]);
  });

  it('blocks when a session was missed', () => {
    const records = perfectRecords();
    records[2] = { ...records[2]!, attended: false };
    const r = evaluateGraduationReadiness(input({ records }));
    expect(r.attendedAllSessions).toBe(false);
    expect(r.eligible).toBe(false);
    expect(r.outstanding).toContain('Has not attended all four sessions');
  });

  it('blocks when one homework was not passed', () => {
    const records = perfectRecords();
    records[0] = { ...records[0]!, homeworkPassed: false };
    const r = evaluateGraduationReadiness(input({ records }));
    expect(r.passedAllHomework).toBe(false);
    expect(r.eligible).toBe(false);
  });

  it('blocks when one quiz was not passed', () => {
    const records = perfectRecords();
    records[3] = { ...records[3]!, quizPassed: null };
    const r = evaluateGraduationReadiness(input({ records }));
    expect(r.passedAllQuizzes).toBe(false);
    expect(r.eligible).toBe(false);
  });

  it('blocks when the final test was failed', () => {
    const r = evaluateGraduationReadiness(input({ finalTestPassed: false }));
    expect(r.passedFinalTest).toBe(false);
    expect(r.outstanding).toContain('Final test not passed');
    expect(r.eligible).toBe(false);
  });

  it('blocks when the final test was passed after the deadline', () => {
    const r = evaluateGraduationReadiness(
      input({ finalTestTakenAt: '2026-07-05T09:00:00.000Z', finalTestDeadline: '2026-06-30' }),
    );
    expect(r.passedFinalTest).toBe(true);
    expect(r.finalTestBeforeDeadline).toBe(false);
    expect(r.outstanding).toContain('Final test taken after the deadline');
    expect(r.eligible).toBe(false);
  });

  it('counts a test sat on the deadline day itself as on time', () => {
    const r = evaluateGraduationReadiness(
      input({ finalTestTakenAt: '2026-06-30T18:30:00.000Z', finalTestDeadline: '2026-06-30' }),
    );
    expect(r.finalTestBeforeDeadline).toBe(true);
    expect(r.eligible).toBe(true);
  });

  it('treats a missing deadline as nothing to be late for', () => {
    const r = evaluateGraduationReadiness(
      input({ finalTestDeadline: null, finalTestTakenAt: null }),
    );
    expect(r.finalTestBeforeDeadline).toBe(true);
    expect(r.eligible).toBe(true);
  });

  it('fails the deadline check when the test was never sat', () => {
    const r = evaluateGraduationReadiness(
      input({ finalTestTakenAt: null, finalTestPassed: false }),
    );
    expect(r.finalTestBeforeDeadline).toBe(false);
    expect(r.eligible).toBe(false);
  });

  // The headline rule: finishing session 4 is not the same as completing.
  it('blocks a member who finished all four sessions but skipped the induction', () => {
    const r = evaluateGraduationReadiness(input({ inductionAttended: false }));
    expect(r.attendedAllSessions).toBe(true);
    expect(r.passedAllHomework).toBe(true);
    expect(r.passedAllQuizzes).toBe(true);
    expect(r.passedFinalTest).toBe(true);
    expect(r.attendedInduction).toBe(false);
    expect(r.eligible).toBe(false);
    expect(r.outstanding).toEqual(['Has not attended the induction ceremony']);
  });

  it('is never eligible when the cohort has no sessions scheduled', () => {
    const r = evaluateGraduationReadiness(input({ sessionCount: 0, records: [] }));
    expect(r.attendedAllSessions).toBe(false);
    expect(r.eligible).toBe(false);
  });

  it('lists every outstanding requirement at once', () => {
    const r = evaluateGraduationReadiness(
      input({
        records: [],
        finalTestPassed: false,
        finalTestTakenAt: null,
        inductionAttended: false,
      }),
    );
    expect(r.outstanding).toHaveLength(5);
    expect(r.eligible).toBe(false);
  });
});

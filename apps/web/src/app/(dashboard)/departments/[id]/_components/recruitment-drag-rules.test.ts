import { describe, expect, it } from 'vitest';
import {
  canDragRecruitmentRequest,
  getRecruitmentDropRule,
} from './recruitment-drag-rules';

describe('recruitment drag rules', () => {
  it('maps valid next-stage drops to the existing workflow action', () => {
    expect(getRecruitmentDropRule({ status: 'applied' }, 'interview_scheduled')).toEqual({
      allowed: true,
      action: 'schedule',
    });
    expect(getRecruitmentDropRule({ status: 'interview_scheduled' }, 'interviewed')).toEqual({
      allowed: true,
      action: 'record',
    });
    expect(
      getRecruitmentDropRule({ status: 'interviewed', interviewOutcome: 'pass' }, 'offered'),
    ).toEqual({ allowed: true, action: 'offer' });
  });

  it('blocks movements that need applicant action or skipped workflow stages', () => {
    expect(getRecruitmentDropRule({ status: 'offered' }, 'probation')).toEqual({
      allowed: false,
      reason: 'The applicant must accept the offer before probation starts.',
    });
    expect(getRecruitmentDropRule({ status: 'applied' }, 'offered')).toEqual({
      allowed: false,
      reason: 'Recruitment cards can only move to the next required workflow stage.',
    });
  });

  it('only enables dragging for stages with manager-driven next actions', () => {
    expect(canDragRecruitmentRequest({ status: 'applied' })).toBe(true);
    expect(canDragRecruitmentRequest({ status: 'interview_scheduled' })).toBe(true);
    expect(canDragRecruitmentRequest({ status: 'interviewed', interviewOutcome: 'pass' })).toBe(true);
    expect(canDragRecruitmentRequest({ status: 'interviewed', interviewOutcome: 'fail' })).toBe(false);
    expect(canDragRecruitmentRequest({ status: 'offered' })).toBe(false);
  });
});

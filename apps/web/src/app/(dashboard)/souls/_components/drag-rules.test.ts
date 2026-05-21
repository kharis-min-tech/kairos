import { describe, expect, it } from 'vitest';
import { getSoulDisposition, getSoulDropRule, getSoulLane } from './drag-rules';

describe('soul drag rules', () => {
  it('maps outcome statuses into the following up lane', () => {
    expect(getSoulLane('New')).toBe('New');
    expect(getSoulLane('Following Up')).toBe('Following Up');
    expect(getSoulLane('Interested')).toBe('Following Up');
    expect(getSoulLane('Not Interested')).toBe('Following Up');
    expect(getSoulLane('Lost Contact')).toBe('Following Up');
    expect(getSoulLane('Converted')).toBe('Converted');
  });

  it('identifies outcome statuses for card badges', () => {
    expect(getSoulDisposition('Interested')).toBe('Interested');
    expect(getSoulDisposition('Not Interested')).toBe('Not Interested');
    expect(getSoulDisposition('Following Up')).toBeNull();
  });

  it('allows moving from new into active follow-up', () => {
    expect(getSoulDropRule('New', 'Following Up')).toEqual({ allowed: true });
  });

  it('blocks no-op lane drops and conversion drops', () => {
    expect(getSoulDropRule('New', 'New').allowed).toBe(false);
    expect(getSoulDropRule('Interested', 'Following Up').allowed).toBe(false);
    expect(getSoulDropRule('Interested', 'Converted')).toEqual({
      allowed: false,
      reason: 'Use the conversion flow from the soul details page so the member record is created.',
    });
  });

  it('blocks dragging converted souls back into the active pipeline', () => {
    expect(getSoulDropRule('Converted', 'Following Up')).toEqual({
      allowed: false,
      reason: 'Converted souls are already linked to a member. Update the record from the soul details page if this was converted in error.',
    });
  });
});

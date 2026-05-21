import { describe, it, expect } from 'vitest';
import { calculateSoulRAGStatus, calculateFollowUpRAGStatus } from './dashboard-service';

describe('calculateSoulRAGStatus', () => {
  describe('no follow-up needed statuses', () => {
    it.each(['Converted', 'Not Interested', 'Lost Contact'])(
      'returns GREEN for %s status regardless of follow-up state',
      (status) => {
        const result = calculateSoulRAGStatus(status, null, false);
        expect(result.ragStatus).toBe('GREEN');
        expect(result.ragReason).toBe('No follow-up needed');
      },
    );

    it('returns GREEN for Converted even when follow-up exists and is stale', () => {
      const result = calculateSoulRAGStatus('Converted', 30, true);
      expect(result.ragStatus).toBe('GREEN');
    });
  });

  describe('no follow-up logged yet', () => {
    it('returns RED when hasFollowUp is false', () => {
      const result = calculateSoulRAGStatus('New', null, false);
      expect(result.ragStatus).toBe('RED');
      expect(result.ragReason).toBe('No follow-up logged yet');
    });

    it('returns RED when daysSinceLastFollowUp is null even if hasFollowUp is true', () => {
      const result = calculateSoulRAGStatus('Following Up', null, true);
      expect(result.ragStatus).toBe('RED');
      expect(result.ragReason).toBe('No follow-up logged yet');
    });
  });

  describe('New / Following Up status thresholds', () => {
    it.each(['New', 'Following Up'])('returns GREEN for %s when contacted < 2 days ago', (status) => {
      const result = calculateSoulRAGStatus(status, 1, true);
      expect(result.ragStatus).toBe('GREEN');
      expect(result.ragReason).toBe('Recent contact');
    });

    it.each(['New', 'Following Up'])('returns AMBER for %s at exactly 2 days', (status) => {
      const result = calculateSoulRAGStatus(status, 2, true);
      expect(result.ragStatus).toBe('AMBER');
      expect(result.ragReason).toBe('2 days since last contact');
    });

    it.each(['New', 'Following Up'])('returns RED for %s at >= 3 days', (status) => {
      const result = calculateSoulRAGStatus(status, 3, true);
      expect(result.ragStatus).toBe('RED');
      expect(result.ragReason).toBe('3 days since last contact');

      const olderResult = calculateSoulRAGStatus(status, 10, true);
      expect(olderResult.ragStatus).toBe('RED');
      expect(olderResult.ragReason).toBe('10 days since last contact');
    });
  });

  describe('Interested status thresholds', () => {
    it('returns GREEN when contacted < 3 days ago', () => {
      expect(calculateSoulRAGStatus('Interested', 0, true).ragStatus).toBe('GREEN');
      expect(calculateSoulRAGStatus('Interested', 2, true).ragStatus).toBe('GREEN');
    });

    it('returns AMBER between 3 and 4 days', () => {
      expect(calculateSoulRAGStatus('Interested', 3, true).ragStatus).toBe('AMBER');
      expect(calculateSoulRAGStatus('Interested', 4, true).ragStatus).toBe('AMBER');
    });

    it('returns RED at >= 5 days', () => {
      const result = calculateSoulRAGStatus('Interested', 5, true);
      expect(result.ragStatus).toBe('RED');
      expect(result.ragReason).toBe('5 days since last contact');
    });
  });

  describe('unknown status fallback', () => {
    it('returns GREEN with on-track reason for unrecognized statuses', () => {
      const result = calculateSoulRAGStatus('Unknown', 1, true);
      expect(result.ragStatus).toBe('GREEN');
      expect(result.ragReason).toBe('On track');
    });
  });
});

describe('calculateFollowUpRAGStatus', () => {
  it.each(['Wrong Number', 'Declined'])('returns RED for %s', (status) => {
    const result = calculateFollowUpRAGStatus(status);
    expect(result.ragStatus).toBe('RED');
    expect(result.ragReason).toBe(status);
  });

  it.each(['No Answer', 'Busy'])('returns AMBER for %s', (status) => {
    const result = calculateFollowUpRAGStatus(status);
    expect(result.ragStatus).toBe('AMBER');
    expect(result.ragReason).toBe(status);
  });

  it.each(['Successful', 'Scheduled', 'Completed'])('returns GREEN for %s', (status) => {
    const result = calculateFollowUpRAGStatus(status);
    expect(result.ragStatus).toBe('GREEN');
    expect(result.ragReason).toBe(status);
  });

  it('returns AMBER with unknown reason for unrecognized status values', () => {
    const result = calculateFollowUpRAGStatus('SomethingElse');
    expect(result.ragStatus).toBe('AMBER');
    expect(result.ragReason).toBe('Unknown status');
  });
});

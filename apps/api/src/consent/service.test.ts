import { describe, it, expect, vi, beforeEach } from 'vitest';

function createChain(result: unknown = []) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select', 'from', 'where', 'orderBy', 'limit',
    'insert', 'values',
    'update', 'set',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain['then'] = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

let selectResults: unknown[];
let selectCallIndex: number;
let insertCalls: unknown[];

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
} as unknown as import('@kairos/database').Database;

function setupSelectSequence(...results: unknown[]) {
  selectResults = results;
  selectCallIndex = 0;
  (mockDb.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const r = selectResults[selectCallIndex] ?? selectResults[selectResults.length - 1];
    selectCallIndex++;
    return createChain(r);
  });
}

function setupInsert() {
  insertCalls = [];
  (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const chain = createChain([]);
    chain.values = vi.fn((arg: unknown) => {
      insertCalls.push(arg);
      return chain;
    });
    return chain;
  });
}

function setupUpdate() {
  (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(() => createChain([]));
}

import {
  listConsentStatuses,
  recordConsent,
  getCurrentConsentVersions,
} from './service';
import { ConsentType } from '@kairos/types';

const memberId = 'aaaa0000-0000-0000-0000-000000000001';

beforeEach(() => {
  setupInsert();
  setupUpdate();
  delete process.env['CONSENT_VERSION_TERMS'];
  delete process.env['CONSENT_VERSION_PRIVACY'];
  delete process.env['CONSENT_VERSION_MARKETING'];
});

describe('getCurrentConsentVersions', () => {
  it('defaults to the current published version for terms + privacy, and 1.0 for marketing', () => {
    expect(getCurrentConsentVersions()).toEqual({
      terms: '2026-07-v1',
      privacy: '2026-07-v1',
      marketing: '1.0',
    });
  });

  it('reads env overrides', () => {
    process.env['CONSENT_VERSION_TERMS'] = '2.0';
    process.env['CONSENT_VERSION_MARKETING'] = '3.5';
    const versions = getCurrentConsentVersions();
    expect(versions.terms).toBe('2.0');
    expect(versions.marketing).toBe('3.5');
    // privacy falls back to its published default when the env var is unset
    expect(versions.privacy).toBe('2026-07-v1');
  });
});

describe('listConsentStatuses', () => {
  it('marks required consents as needsAccept when never granted', async () => {
    setupSelectSequence([]);
    const out = await listConsentStatuses(mockDb, memberId);
    const terms = out.find((s) => s.consentType === ConsentType.Terms)!;
    expect(terms.needsAccept).toBe(true);
    expect(terms.required).toBe(true);
    expect(terms.granted).toBeNull();
  });

  it('marks required consent as accepted when version matches + granted=true', async () => {
    setupSelectSequence([
      { consentType: 'terms', version: '2026-07-v1', granted: true, grantedAt: new Date('2026-07-23') },
    ]);
    const out = await listConsentStatuses(mockDb, memberId);
    const terms = out.find((s) => s.consentType === ConsentType.Terms)!;
    expect(terms.needsAccept).toBe(false);
    expect(terms.granted).toBe(true);
    expect(terms.acceptedVersion).toBe('2026-07-v1');
  });

  it('re-prompts after env version bumps past stored version', async () => {
    process.env['CONSENT_VERSION_TERMS'] = '2.0';
    setupSelectSequence([
      { consentType: 'terms', version: '1.0', granted: true, grantedAt: new Date('2026-06-01') },
    ]);
    const out = await listConsentStatuses(mockDb, memberId);
    const terms = out.find((s) => s.consentType === ConsentType.Terms)!;
    expect(terms.needsAccept).toBe(true);
    expect(terms.currentVersion).toBe('2.0');
    expect(terms.acceptedVersion).toBe('1.0');
  });

  it('optional marketing consent does not need-accept when never granted', async () => {
    setupSelectSequence([]);
    const out = await listConsentStatuses(mockDb, memberId);
    const marketing = out.find((s) => s.consentType === ConsentType.Marketing)!;
    expect(marketing.required).toBe(false);
    expect(marketing.needsAccept).toBe(false);
  });
});

describe('recordConsent', () => {
  it('inserts a new row when no existing record for the version', async () => {
    setupSelectSequence([]); // no existing
    await recordConsent(mockDb, memberId, ConsentType.Marketing, true);
    expect(insertCalls).toHaveLength(1);
    const row = insertCalls[0] as { granted: boolean; version: string; consentType: string };
    expect(row.granted).toBe(true);
    expect(row.version).toBe('1.0');
    expect(row.consentType).toBe('marketing');
  });

  it('updates existing row instead of inserting duplicate', async () => {
    setupSelectSequence([{ id: 'existing-id' }]);
    await recordConsent(mockDb, memberId, ConsentType.Terms, true);
    expect(insertCalls).toHaveLength(0);
    expect(mockDb.update).toHaveBeenCalled();
  });
});

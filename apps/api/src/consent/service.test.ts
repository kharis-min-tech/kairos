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
  delete process.env['CONSENT_VERSION_ACCEPTABLE_USE'];
  delete process.env['CONSENT_VERSION_ADMIN_CONFIDENTIALITY'];
});

describe('getCurrentConsentVersions', () => {
  it('defaults to the current published version for terms + privacy + acceptable use + admin confidentiality, and 1.0 for marketing', () => {
    expect(getCurrentConsentVersions()).toEqual({
      terms: '2026-07-v1',
      privacy: '2026-07-v1',
      marketing: '1.0',
      acceptable_use: '2026-07-v1',
      admin_confidentiality: '2026-07-v1',
    });
  });

  it('reads env overrides', () => {
    process.env['CONSENT_VERSION_TERMS'] = '2.0';
    process.env['CONSENT_VERSION_MARKETING'] = '3.5';
    process.env['CONSENT_VERSION_ACCEPTABLE_USE'] = '2027-01';
    process.env['CONSENT_VERSION_ADMIN_CONFIDENTIALITY'] = '2027-02';
    const versions = getCurrentConsentVersions();
    expect(versions.terms).toBe('2.0');
    expect(versions.marketing).toBe('3.5');
    expect(versions.acceptable_use).toBe('2027-01');
    expect(versions.admin_confidentiality).toBe('2027-02');
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

  it('acceptable_use is always required and needsAccept for a fresh user', async () => {
    setupSelectSequence([]);
    const out = await listConsentStatuses(mockDb, memberId);
    const aup = out.find((s) => s.consentType === ConsentType.AcceptableUse)!;
    expect(aup.required).toBe(true);
    expect(aup.needsAccept).toBe(true);
  });

  it('admin_confidentiality is NOT required for a plain member (isPrivileged omitted)', async () => {
    setupSelectSequence([]);
    const out = await listConsentStatuses(mockDb, memberId);
    const conf = out.find((s) => s.consentType === ConsentType.AdminConfidentiality)!;
    expect(conf.required).toBe(false);
    expect(conf.needsAccept).toBe(false);
  });

  it('admin_confidentiality IS required for a privileged caller (isPrivileged=true)', async () => {
    setupSelectSequence([]);
    const out = await listConsentStatuses(mockDb, memberId, true);
    const conf = out.find((s) => s.consentType === ConsentType.AdminConfidentiality)!;
    expect(conf.required).toBe(true);
    expect(conf.needsAccept).toBe(true);
  });

  it('admin_confidentiality accepted at current version does not need-accept even when privileged', async () => {
    setupSelectSequence([
      {
        consentType: 'admin_confidentiality',
        version: '2026-07-v1',
        granted: true,
        grantedAt: new Date('2026-07-28'),
      },
    ]);
    const out = await listConsentStatuses(mockDb, memberId, true);
    const conf = out.find((s) => s.consentType === ConsentType.AdminConfidentiality)!;
    expect(conf.needsAccept).toBe(false);
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

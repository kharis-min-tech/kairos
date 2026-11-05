import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AuthContext } from '@kairos/types';
import { CHURCH_SCOPE, FunctionalRole, GIFT_AID_WORDING_VERSION } from '@kairos/types';

// ── Drizzle mock ──────────────────────────────────────────
//
// Same shape as consent/service.test.ts: a chainable stub whose `then`
// resolves to a canned result, plus a queue so a function that issues several
// selects gets a different answer each time.

function createChain(result: unknown = []) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select', 'from', 'where', 'orderBy', 'limit', 'offset', 'leftJoin',
    'insert', 'values', 'returning',
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
let insertValues: unknown[];
let updateSets: unknown[];
let insertReturning: unknown[];
let updateReturning: unknown[];

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
} as unknown as import('@kairos/database').Database;

function setupSelects(...results: unknown[]) {
  selectResults = results;
  selectCallIndex = 0;
  (mockDb.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const r = selectResults[selectCallIndex] ?? selectResults[selectResults.length - 1] ?? [];
    selectCallIndex++;
    return createChain(r);
  });
}

function setupInsert(returning: unknown[] = []) {
  insertValues = [];
  insertReturning = returning;
  (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const chain = createChain(insertReturning);
    chain['values'] = vi.fn((arg: unknown) => {
      insertValues.push(arg);
      return chain;
    });
    chain['returning'] = vi.fn(() => createChain(insertReturning));
    return chain;
  });
}

function setupUpdate(returning: unknown[] = []) {
  updateSets = [];
  updateReturning = returning;
  (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const chain = createChain(updateReturning);
    chain['set'] = vi.fn((arg: unknown) => {
      updateSets.push(arg);
      return chain;
    });
    chain['returning'] = vi.fn(() => createChain(updateReturning));
    return chain;
  });
}

import {
  captureDeclaration,
  declareMine,
  exportRegister,
  getMyGiftAidStatus,
  listDeclarations,
  matchDeclaration,
  recordWithdrawal,
  registerToCsv,
  submitPublicDeclaration,
  withdrawMine,
} from './service';

const MEMBER_ID = 'aaaa0000-0000-0000-0000-000000000001';
const OTHER_MEMBER_ID = 'aaaa0000-0000-0000-0000-000000000002';
const BRANCH_ID = 'bbbb0000-0000-0000-0000-000000000001';
const OTHER_BRANCH_ID = 'bbbb0000-0000-0000-0000-000000000002';
const DECLARATION_ID = 'cccc0000-0000-0000-0000-000000000001';

function auth(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    memberId: MEMBER_ID,
    email: 'donor@example.com',
    systemRole: 'member',
    branchId: BRANCH_ID,
    grants: [],
    ...overrides,
  } as AuthContext;
}

const giftAidAdmin = auth({
  grants: [
    { role: FunctionalRole.GiftAidAdmin, scope: CHURCH_SCOPE, branchId: BRANCH_ID },
  ],
} as Partial<AuthContext>);

const branchAdmin = auth({
  grants: [
    {
      role: FunctionalRole.BranchAdmin,
      scope: { kind: 'branch', id: BRANCH_ID },
      branchId: BRANCH_ID,
    },
  ],
} as Partial<AuthContext>);

const platformAdmin = auth({ systemRole: 'admin' });

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: DECLARATION_ID,
    memberId: MEMBER_ID,
    branchId: BRANCH_ID,
    title: 'Mr',
    firstName: 'Ade',
    lastName: 'Bolarinwa',
    addressLine1: '12 High Street',
    addressLine2: null,
    city: 'London',
    postcode: 'SE1 2AB',
    countryCode: 'GB',
    email: 'donor@example.com',
    phone: null,
    coverage: 'past_and_future',
    coversFrom: '2022-10-30',
    singleGiftDescription: null,
    channel: 'online',
    wordingVersion: GIFT_AID_WORDING_VERSION,
    declarationText: 'I want to Gift Aid all qualifying gifts...',
    evidenceUrl: null,
    sourceIp: null,
    userAgent: null,
    writtenConfirmationSentAt: null,
    declaredAt: new Date('2026-10-30T10:00:00Z'),
    capturedById: null,
    status: 'active',
    cancelledAt: null,
    cancellationMethod: null,
    cancellationNotes: null,
    cancelledById: null,
    supersededById: null,
    retentionReviewAt: null,
    isActive: true,
    createdAt: new Date('2026-10-30T10:00:00Z'),
    updatedAt: new Date('2026-10-30T10:00:00Z'),
    ...overrides,
  };
}

const declarantInput = {
  title: 'Mr',
  firstName: 'Ade',
  lastName: 'Bolarinwa',
  addressLine1: '12 High Street',
  city: 'London',
  postcode: 'se12ab',
  countryCode: 'GB',
  coverage: 'past_and_future' as const,
  confirmedDeclaration: true as const,
};

beforeEach(() => {
  setupSelects([]);
  setupInsert([]);
  setupUpdate([]);
});

// ── Authority ─────────────────────────────────────────────

describe('authority', () => {
  it('refuses a plain member every admin surface', async () => {
    await expect(
      listDeclarations(mockDb, auth(), { page: 1, limit: 25, sortOrder: 'desc' }),
    ).rejects.toThrow(/Gift Aid admins/);
  });

  it('refuses a BranchAdmin: a church target takes no hierarchical match', async () => {
    await expect(
      listDeclarations(mockDb, branchAdmin, { page: 1, limit: 25, sortOrder: 'desc' }),
    ).rejects.toThrow(/Gift Aid admins/);
  });

  it('allows a church-scoped Gift Aid Admin', async () => {
    setupSelects([row()], [{ total: 1 }]);
    const result = await listDeclarations(mockDb, giftAidAdmin, {
      page: 1,
      limit: 25,
      sortOrder: 'desc',
    });
    expect(result.total).toBe(1);
    expect(result.items[0]?.id).toBe(DECLARATION_ID);
  });

  it('allows the platform admin', async () => {
    setupSelects([], [{ total: 0 }]);
    await expect(
      listDeclarations(mockDb, platformAdmin, { page: 1, limit: 25, sortOrder: 'desc' }),
    ).resolves.toMatchObject({ total: 0 });
  });
});

// ── Donor-facing ──────────────────────────────────────────

describe('getMyGiftAidStatus', () => {
  it('splits the active declaration from the history and blocks a second one', async () => {
    setupSelects([row(), row({ id: 'old', status: 'cancelled', cancelledAt: new Date() })]);
    const result = await getMyGiftAidStatus(mockDb, auth());
    expect(result.active?.id).toBe(DECLARATION_ID);
    expect(result.history).toHaveLength(1);
    expect(result.canDeclare).toBe(false);
  });

  it('lets a member with no declaration make one', async () => {
    setupSelects([]);
    const result = await getMyGiftAidStatus(mockDb, auth());
    expect(result.active).toBeNull();
    expect(result.canDeclare).toBe(true);
  });
});

describe('declareMine', () => {
  it('stores the rendered wording, not anything the client sent', async () => {
    setupSelects([]);
    setupInsert([row({ id: 'new' })]);
    await declareMine(mockDb, auth(), {
      ...declarantInput,
      // A crafted request trying to store wording the donor never agreed to.
      declarationText: 'I agree to nothing at all',
    } as never);

    const values = insertValues[0] as Record<string, unknown>;
    expect(values['declarationText']).toContain('I want to Gift Aid');
    expect(values['declarationText']).toContain('Kharis Ministries');
    expect(values['declarationText']).not.toContain('nothing at all');
    expect(values['wordingVersion']).toBe(GIFT_AID_WORDING_VERSION);
  });

  it('normalises the postcode to HMRC claim format at capture', async () => {
    setupSelects([]);
    setupInsert([row({ id: 'new' })]);
    await declareMine(mockDb, auth(), declarantInput as never);
    expect((insertValues[0] as Record<string, unknown>)['postcode']).toBe('SE1 2AB');
  });

  it('sets coversFrom four years back for backdated coverage', async () => {
    setupSelects([]);
    setupInsert([row({ id: 'new' })]);
    await declareMine(mockDb, auth(), declarantInput as never);
    const coversFrom = (insertValues[0] as Record<string, unknown>)['coversFrom'] as string;
    const years = new Date().getUTCFullYear() - Number(coversFrom.slice(0, 4));
    expect(years).toBe(4);
  });

  it('leaves coversFrom null when the donor declines to backdate', async () => {
    setupSelects([]);
    setupInsert([row({ id: 'new' })]);
    await declareMine(mockDb, auth(), { ...declarantInput, coverage: 'future' } as never);
    expect((insertValues[0] as Record<string, unknown>)['coversFrom']).toBeNull();
  });

  it('withdraws and supersedes an existing declaration rather than editing it', async () => {
    setupSelects([row()]);
    setupInsert([row({ id: 'new-id' })]);
    await declareMine(mockDb, auth(), declarantInput as never);

    expect(updateSets).toHaveLength(1);
    const set = updateSets[0] as Record<string, unknown>;
    expect(set['status']).toBe('cancelled');
    expect(set['cancellationMethod']).toBe('online');
    expect(set['supersededById']).toBe('new-id');
    // The retention clock starts at withdrawal, not at deletion.
    expect(set['retentionReviewAt']).toBeInstanceOf(Date);
  });
});

describe('withdrawMine', () => {
  it('records the date and the method, and keeps the row', async () => {
    setupSelects([row()]);
    setupUpdate([row({ status: 'cancelled', cancelledAt: new Date(), cancellationMethod: 'online' })]);
    const result = await withdrawMine(mockDb, auth(), 'No longer a taxpayer');

    const set = updateSets[0] as Record<string, unknown>;
    expect(set['status']).toBe('cancelled');
    expect(set['cancelledAt']).toBeInstanceOf(Date);
    expect(set['cancellationMethod']).toBe('online');
    expect(set['cancellationNotes']).toBe('No longer a taxpayer');
    expect(set['isActive']).toBeUndefined();
    expect(result.status).toBe('cancelled');
  });

  it('404s when nothing is in force', async () => {
    setupSelects([]);
    await expect(withdrawMine(mockDb, auth())).rejects.toThrow(/Active Gift Aid declaration/);
  });
});

// ── Public form ───────────────────────────────────────────

describe('submitPublicDeclaration', () => {
  it('records an in-force declaration with no member, when the email is unknown', async () => {
    setupSelects([]);
    setupInsert([{ id: 'new', declaredAt: new Date('2026-10-30T10:00:00Z') }]);
    const result = await submitPublicDeclaration(
      mockDb,
      { ...declarantInput, email: 'stranger@example.com' } as never,
      { sourceIp: '203.0.113.4', userAgent: 'jest' },
    );

    const values = insertValues[0] as Record<string, unknown>;
    expect(values['memberId']).toBeNull();
    expect(values['status']).toBe('active');
    expect(values['sourceIp']).toBe('203.0.113.4');
    expect(result.id).toBe('new');
  });

  it('links the declaration when the email matches an active member exactly', async () => {
    setupSelects([{ id: OTHER_MEMBER_ID, homeBranchId: OTHER_BRANCH_ID }], []);
    setupInsert([{ id: 'new', declaredAt: new Date() }]);
    await submitPublicDeclaration(
      mockDb,
      { ...declarantInput, email: 'donor@example.com' } as never,
      {},
    );
    const values = insertValues[0] as Record<string, unknown>;
    expect(values['memberId']).toBe(OTHER_MEMBER_ID);
    expect(values['branchId']).toBe(OTHER_BRANCH_ID);
  });

  it('refuses to stack a second declaration on a donor who already has one', async () => {
    setupSelects([{ id: OTHER_MEMBER_ID, homeBranchId: OTHER_BRANCH_ID }], [row()]);
    await expect(
      submitPublicDeclaration(mockDb, { ...declarantInput, email: 'donor@example.com' } as never, {}),
    ).rejects.toThrow(/already in place/);
  });
});

// ── Admin ─────────────────────────────────────────────────

describe('captureDeclaration', () => {
  it('keeps the donor’s declaration date, not today’s', async () => {
    setupSelects([]);
    setupInsert([row({ channel: 'paper' })]);
    const declaredAt = new Date('2025-03-09T00:00:00Z');
    await captureDeclaration(mockDb, giftAidAdmin, {
      ...declarantInput,
      channel: 'paper',
      declaredAt,
      evidenceUrl: 'https://example.org/scan.pdf',
    } as never);

    const values = insertValues[0] as Record<string, unknown>;
    expect(values['declaredAt']).toEqual(declaredAt);
    expect(values['channel']).toBe('paper');
    expect(values['evidenceUrl']).toBe('https://example.org/scan.pdf');
    // Backdating runs from the donor's date, not from now.
    expect(values['coversFrom']).toBe('2021-03-09');
  });

  it('rejects a declaration dated in the future', async () => {
    const declaredAt = new Date(Date.now() + 86_400_000);
    await expect(
      captureDeclaration(mockDb, giftAidAdmin, {
        ...declarantInput,
        channel: 'paper',
        declaredAt,
        evidenceUrl: 'https://example.org/scan.pdf',
      } as never),
    ).rejects.toThrow(/future/);
  });

  it('refuses a second in-force declaration for the same member', async () => {
    setupSelects([{ id: OTHER_MEMBER_ID, homeBranchId: OTHER_BRANCH_ID }], [row()]);
    await expect(
      captureDeclaration(mockDb, giftAidAdmin, {
        ...declarantInput,
        memberId: OTHER_MEMBER_ID,
        channel: 'imported',
        declaredAt: new Date('2025-01-01T00:00:00Z'),
      } as never),
    ).rejects.toThrow(/already has a Gift Aid declaration/);
  });
});

describe('matchDeclaration', () => {
  it('links the member without touching the declared name or address', async () => {
    setupSelects(
      [row({ memberId: null, branchId: null })],
      [{ id: OTHER_MEMBER_ID, homeBranchId: OTHER_BRANCH_ID }],
      [],
    );
    setupUpdate([row({ memberId: OTHER_MEMBER_ID })]);
    await matchDeclaration(mockDb, giftAidAdmin, DECLARATION_ID, OTHER_MEMBER_ID);

    const set = updateSets[0] as Record<string, unknown>;
    expect(set['memberId']).toBe(OTHER_MEMBER_ID);
    expect(set['branchId']).toBe(OTHER_BRANCH_ID);
    expect(set['firstName']).toBeUndefined();
    expect(set['addressLine1']).toBeUndefined();
    expect(set['postcode']).toBeUndefined();
  });

  it('refuses to re-match a declaration that already has a member', async () => {
    setupSelects([row()]);
    await expect(
      matchDeclaration(mockDb, giftAidAdmin, DECLARATION_ID, OTHER_MEMBER_ID),
    ).rejects.toThrow(/already matched/);
  });

  it('404s on an unknown member', async () => {
    setupSelects([row({ memberId: null })], []);
    await expect(
      matchDeclaration(mockDb, giftAidAdmin, DECLARATION_ID, OTHER_MEMBER_ID),
    ).rejects.toThrow(/Member/);
  });
});

describe('recordWithdrawal', () => {
  it('stores the method a withdrawal arrived by', async () => {
    setupSelects([row()]);
    setupUpdate([row({ status: 'cancelled', cancelledAt: new Date(), cancellationMethod: 'letter' })]);
    await recordWithdrawal(mockDb, giftAidAdmin, DECLARATION_ID, {
      method: 'letter',
      notes: 'Letter dated 20 October',
    } as never);

    const set = updateSets[0] as Record<string, unknown>;
    expect(set['cancellationMethod']).toBe('letter');
    expect(set['cancelledById']).toBe(MEMBER_ID);
    expect(set['retentionReviewAt']).toBeInstanceOf(Date);
  });

  it('refuses a withdrawal dated before the declaration', async () => {
    setupSelects([row()]);
    await expect(
      recordWithdrawal(mockDb, giftAidAdmin, DECLARATION_ID, {
        method: 'phone',
        cancelledAt: new Date('2020-01-01T00:00:00Z'),
      } as never),
    ).rejects.toThrow(/predate/);
  });

  it('refuses to withdraw something already withdrawn', async () => {
    setupSelects([row({ status: 'cancelled', cancelledAt: new Date() })]);
    await expect(
      recordWithdrawal(mockDb, giftAidAdmin, DECLARATION_ID, { method: 'phone' } as never),
    ).rejects.toThrow(/in force/);
  });
});

// ── Register ──────────────────────────────────────────────

describe('exportRegister', () => {
  it('shapes UK donors to the claim columns', async () => {
    setupSelects([{ declaration: row(), branchName: 'Peckham' }]);
    const rows = await exportRegister(mockDb, giftAidAdmin, { status: 'active' } as never);
    expect(rows[0]).toMatchObject({
      title: 'Mr',
      name: 'Ade Bolarinwa',
      houseNameOrNumber: '12 High Street',
      postcode: 'SE1 2AB',
      overseasAddress: '',
      branchName: 'Peckham',
    });
  });

  it('blanks the postcode for an overseas donor and gives the full address', async () => {
    setupSelects([
      {
        declaration: row({ countryCode: 'GH', postcode: null, city: 'Accra' }),
        branchName: 'Accra',
      },
    ]);
    const rows = await exportRegister(mockDb, giftAidAdmin, { status: 'active' } as never);
    expect(rows[0]?.postcode).toBe('');
    expect(rows[0]?.overseasAddress).toContain('Accra');
  });

  it('refuses a plain member', async () => {
    await expect(
      exportRegister(mockDb, auth(), { status: 'active' } as never),
    ).rejects.toThrow(/Gift Aid admins/);
  });
});

describe('registerToCsv', () => {
  it('writes the HMRC-shaped header row', () => {
    const csv = registerToCsv([]);
    expect(csv.split('\r\n')[0]).toBe(
      'Title,Name,House name or number,Postcode,Overseas address,Declared on,Covers donations from,Status,Withdrawn on,Email,Branch',
    );
  });

  it('neutralises a cell a spreadsheet would read as a formula', () => {
    const csv = registerToCsv([
      {
        title: '',
        name: '=1+1',
        houseNameOrNumber: '12 High Street',
        postcode: 'SE1 2AB',
        overseasAddress: '',
        declaredAt: '2026-10-30',
        coversFrom: '2022-10-30',
        status: 'active',
        cancelledAt: '',
        email: 'donor@example.com',
        branchName: 'Peckham',
      },
    ]);
    expect(csv).toContain("'=1+1");
  });

  it('quotes a cell containing a comma', () => {
    const csv = registerToCsv([
      {
        title: '',
        name: 'Ade Bolarinwa',
        houseNameOrNumber: 'Flat 2, The Oaks',
        postcode: 'SE1 2AB',
        overseasAddress: '',
        declaredAt: '2026-10-30',
        coversFrom: '2022-10-30',
        status: 'active',
        cancelledAt: '',
        email: 'donor@example.com',
        branchName: 'Peckham',
      },
    ]);
    expect(csv).toContain('"Flat 2, The Oaks"');
  });
});

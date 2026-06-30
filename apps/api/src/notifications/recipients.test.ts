import { describe, it, expect, vi, beforeEach } from 'vitest';

function createChain(result: unknown = []) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select', 'from', 'where', 'innerJoin', 'leftJoin', 'orderBy', 'limit',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain['then'] = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

let selectResults: unknown[];
let selectCallIndex: number;

const mockDb = {
  select: vi.fn(),
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

import {
  resolveBranchAuthority,
  resolveFellowshipLeaders,
  resolveDepartmentLeads,
  resolveSafeguardingLeads,
} from './recipients';

const branchId = 'aaaa0000-0000-0000-0000-000000000001';
const fellowshipId = 'bbbb0000-0000-0000-0000-000000000002';
const branchDeptId = 'cccc0000-0000-0000-0000-000000000003';

beforeEach(() => {
  selectCallIndex = 0;
});

describe('resolveBranchAuthority', () => {
  it('returns deduped member ids holding BranchAdmin / BranchDataAdmin in the branch', async () => {
    setupSelectSequence([
      { memberId: 'm1' },
      { memberId: 'm2' },
      { memberId: 'm1' }, // duplicate from a different grant
    ]);
    const result = await resolveBranchAuthority(mockDb, branchId);
    expect(new Set(result)).toEqual(new Set(['m1', 'm2']));
  });

  it('returns empty array when no grant rows match', async () => {
    setupSelectSequence([]);
    const result = await resolveBranchAuthority(mockDb, branchId);
    expect(result).toEqual([]);
  });
});

describe('resolveFellowshipLeaders', () => {
  it('returns leader + co-leader member ids', async () => {
    setupSelectSequence([{ leaderId: 'lead-id', coLeaderId: 'colead-id' }]);
    const result = await resolveFellowshipLeaders(mockDb, fellowshipId);
    expect(result).toEqual(['lead-id', 'colead-id']);
  });

  it('skips null leader fields', async () => {
    setupSelectSequence([{ leaderId: 'lead-id', coLeaderId: null }]);
    const result = await resolveFellowshipLeaders(mockDb, fellowshipId);
    expect(result).toEqual(['lead-id']);
  });

  it('returns empty when fellowship not found', async () => {
    setupSelectSequence([]);
    const result = await resolveFellowshipLeaders(mockDb, fellowshipId);
    expect(result).toEqual([]);
  });
});

describe('resolveDepartmentLeads', () => {
  it('returns lead + deputy', async () => {
    setupSelectSequence([{ leadMemberId: 'lead-id', deputyMemberId: 'deputy-id' }]);
    const result = await resolveDepartmentLeads(mockDb, branchDeptId);
    expect(result).toEqual(['lead-id', 'deputy-id']);
  });
});

describe('resolveSafeguardingLeads', () => {
  it('returns deduped SG-Lead member ids for the branch', async () => {
    setupSelectSequence([{ memberId: 'sg1' }, { memberId: 'sg2' }, { memberId: 'sg1' }]);
    const result = await resolveSafeguardingLeads(mockDb, branchId);
    expect(new Set(result)).toEqual(new Set(['sg1', 'sg2']));
  });
});

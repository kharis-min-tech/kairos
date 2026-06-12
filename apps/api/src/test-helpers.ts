import jwt from 'jsonwebtoken';
import type { AuthContext } from '@kairos/types';

const JWT_SECRET = 'dev-secret-change-me';

/** Sign a JWT for use in functional tests */
export function signTestToken(overrides: Partial<AuthContext> = {}): string {
  const payload: AuthContext = {
    memberId: '550e8400-e29b-41d4-a716-446655440000',
    email: 'admin@kairos.local',
    systemRole: 'admin',
    activeRole: 'admin',
    branchId: '660e8400-e29b-41d4-a716-446655440000',
    branchSystemAdminBranchIds: [],
    branchDataAdminBranchIds: [],
    ...overrides,
  } as AuthContext;
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

/** Create a chainable mock that resolves with the given data */
export function createChainable(data: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'from', 'where', 'limit', 'offset', 'orderBy', 'innerJoin', 'leftJoin', 'set', 'values', 'returning', 'groupBy'];
  for (const m of methods) {
    chain[m] = () => chain;
  }
  chain.then = (resolve: (v: unknown) => unknown) => resolve(data);
  return chain;
}

/** Pre-built test IDs */
export const TEST_IDS = {
  adminId: '550e8400-e29b-41d4-a716-446655440000',
  pastorId: '550e8400-e29b-41d4-a716-446655440001',
  memberId: '550e8400-e29b-41d4-a716-446655440002',
  branchId: '660e8400-e29b-41d4-a716-446655440000',
  branch2Id: '660e8400-e29b-41d4-a716-446655440001',
  regionId: '770e8400-e29b-41d4-a716-446655440000',
  fellowshipId: '880e8400-e29b-41d4-a716-446655440000',
  roleId: '990e8400-e29b-41d4-a716-446655440000',
  leadershipId: 'aa0e8400-e29b-41d4-a716-446655440000',
};

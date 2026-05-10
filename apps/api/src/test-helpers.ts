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

import { db } from './db';
import { branches, members, regions } from '@kairos/database';
import bcrypt from 'bcrypt';

/** Create a test region */
export async function createTestRegion(data: { regionName: string }) {
  const [region] = await db
    .insert(regions)
    .values({
      regionName: data.regionName,
      isActive: true,
    })
    .returning();
  return region!;
}

/** Create a test branch */
export async function createTestBranch(data: { branchName: string; regionId?: string }) {
  // Ensure region exists
  let regionId = data.regionId;
  if (!regionId) {
    const region = await createTestRegion({ regionName: 'Test Region' });
    regionId = region.id;
  }
  
  const [branch] = await db
    .insert(branches)
    .values({
      branchName: data.branchName,
      regionId,
      address: '123 Test St',
      city: 'Test City',
      country: 'Test Country',
      isActive: true,
    })
    .returning();
  return branch!;
}

/** Create a test member */
export async function createTestMember(data: {
  email: string;
  firstName: string;
  lastName: string;
  branchId: string;
  systemRole?: string;
  isEmailVerified?: boolean;
  approvalStatus?: string;
}) {
  const hashedPassword = await bcrypt.hash('Password1!', 10);
  const [member] = await db
    .insert(members)
    .values({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      password: hashedPassword,
      homeBranchId: data.branchId,
      systemRole: (data.systemRole as any) ?? 'member',
      isEmailVerified: data.isEmailVerified ?? true,
      approvalStatus: (data.approvalStatus as any) ?? 'approved',
      isActive: true,
    })
    .returning();
  return member!;
}

/** Helper for making test requests with auth */
export function testRequest(app: any, token?: string) {
  return {
    get: (path: string) => {
      const req = new Request(`http://localhost${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return app.fetch(req);
    },
    post: (path: string, body?: any) => {
      const req = new Request(`http://localhost${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return app.fetch(req);
    },
    patch: (path: string, body?: any) => {
      const req = new Request(`http://localhost${path}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return app.fetch(req);
    },
    delete: (path: string) => {
      const req = new Request(`http://localhost${path}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return app.fetch(req);
    },
  };
}

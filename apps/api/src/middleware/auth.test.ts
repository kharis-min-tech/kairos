import { describe, it, expect, vi } from 'vitest';
import type { Context } from 'hono';
import { UnauthorizedError } from '@kairos/utils';
import { requireBranchAdmin, requireBranchSystemAdmin, requireRole } from './auth';
import type { AuthContext } from '@kairos/types';

// ── Fixtures ────────────────────────────────────────────────

const branchA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const branchB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function makeAuth(over: Partial<AuthContext> = {}): AuthContext {
  return {
    memberId: '11111111-1111-1111-1111-111111111111',
    email: 'user@kairos.local',
    systemRole: 'member',
    branchId: branchA,
    branchSystemAdminBranchIds: [],
    branchDataAdminBranchIds: [],
    ...over,
  };
}

/** Build a tiny fake Hono context exposing only what the middleware uses. */
function makeCtx(auth: AuthContext, params: Record<string, string> = {}): Context {
  return {
    get: (key: string) => (key === 'auth' ? auth : undefined),
    req: { param: (k: string) => params[k] },
  } as unknown as Context;
}

// ── requireRole ─────────────────────────────────────────────

describe('requireRole', () => {
  it('passes through when systemRole matches', async () => {
    const next = vi.fn();
    const ctx = makeCtx(makeAuth({ systemRole: 'admin' }));
    await requireRole('admin')(ctx, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('throws Unauthorized when systemRole does not match', async () => {
    const next = vi.fn();
    const ctx = makeCtx(makeAuth({ systemRole: 'member' }));
    await expect(requireRole('admin')(ctx, next)).rejects.toThrow(UnauthorizedError);
    expect(next).not.toHaveBeenCalled();
  });
});

// ── requireBranchAdmin ──────────────────────────────────────

describe('requireBranchAdmin', () => {
  it('allows system admins regardless of branch arrays', async () => {
    const next = vi.fn();
    const ctx = makeCtx(makeAuth({ systemRole: 'admin' }), { id: branchA });
    await requireBranchAdmin()(ctx, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('allows Branch System Admin of the requested branch', async () => {
    const next = vi.fn();
    const ctx = makeCtx(
      makeAuth({ branchSystemAdminBranchIds: [branchA] }),
      { id: branchA },
    );
    await requireBranchAdmin()(ctx, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('allows Branch Data Admin of the requested branch', async () => {
    const next = vi.fn();
    const ctx = makeCtx(
      makeAuth({ branchDataAdminBranchIds: [branchA] }),
      { id: branchA },
    );
    await requireBranchAdmin()(ctx, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('rejects Branch System Admin of a different branch', async () => {
    const next = vi.fn();
    const ctx = makeCtx(
      makeAuth({ branchSystemAdminBranchIds: [branchB] }),
      { id: branchA },
    );
    await expect(requireBranchAdmin()(ctx, next)).rejects.toThrow(UnauthorizedError);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects plain member with neither role', async () => {
    const next = vi.fn();
    const ctx = makeCtx(makeAuth(), { id: branchA });
    await expect(requireBranchAdmin()(ctx, next)).rejects.toThrow(UnauthorizedError);
  });

  it('throws when branch param is missing', async () => {
    const next = vi.fn();
    const ctx = makeCtx(makeAuth({ systemRole: 'admin' }));
    await expect(requireBranchAdmin()(ctx, next)).rejects.toThrow(UnauthorizedError);
  });

  it('honours a non-default branchIdParam name', async () => {
    const next = vi.fn();
    const ctx = makeCtx(
      makeAuth({ branchSystemAdminBranchIds: [branchA] }),
      { branchId: branchA },
    );
    await requireBranchAdmin('branchId')(ctx, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('tolerates legacy tokens missing the branch-admin arrays', async () => {
    const next = vi.fn();
    const legacyAuth = {
      memberId: 'x',
      email: 'x@x',
      systemRole: 'admin' as const,
      branchId: branchA,
    } as AuthContext;
    const ctx = makeCtx(legacyAuth, { id: branchA });
    await requireBranchAdmin()(ctx, next);
    expect(next).toHaveBeenCalledOnce();
  });
});

// ── requireBranchSystemAdmin ────────────────────────────────

describe('requireBranchSystemAdmin', () => {
  it('allows system admins', async () => {
    const next = vi.fn();
    const ctx = makeCtx(makeAuth({ systemRole: 'admin' }), { id: branchA });
    await requireBranchSystemAdmin()(ctx, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('allows Branch System Admin of the requested branch', async () => {
    const next = vi.fn();
    const ctx = makeCtx(
      makeAuth({ branchSystemAdminBranchIds: [branchA] }),
      { id: branchA },
    );
    await requireBranchSystemAdmin()(ctx, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('rejects Branch Data Admin (data admin alone is not enough)', async () => {
    const next = vi.fn();
    const ctx = makeCtx(
      makeAuth({ branchDataAdminBranchIds: [branchA] }),
      { id: branchA },
    );
    await expect(requireBranchSystemAdmin()(ctx, next)).rejects.toThrow(UnauthorizedError);
  });

  it('rejects Branch System Admin of a different branch', async () => {
    const next = vi.fn();
    const ctx = makeCtx(
      makeAuth({ branchSystemAdminBranchIds: [branchB] }),
      { id: branchA },
    );
    await expect(requireBranchSystemAdmin()(ctx, next)).rejects.toThrow(UnauthorizedError);
  });

  it('rejects plain member', async () => {
    const next = vi.fn();
    const ctx = makeCtx(makeAuth(), { id: branchA });
    await expect(requireBranchSystemAdmin()(ctx, next)).rejects.toThrow(UnauthorizedError);
  });

  it('throws when branch param is missing', async () => {
    const next = vi.fn();
    const ctx = makeCtx(makeAuth({ systemRole: 'admin' }));
    await expect(requireBranchSystemAdmin()(ctx, next)).rejects.toThrow(UnauthorizedError);
  });
});

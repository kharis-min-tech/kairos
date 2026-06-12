import { describe, it, expect, vi } from 'vitest';
import type { Context } from 'hono';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '@kairos/utils';
import { authMiddleware, requireBranchAdmin, requireBranchSystemAdmin, requireRole } from './auth';
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

// ── authMiddleware ──────────────────────────────────────────

/**
 * Build a minimal Hono context that captures `set('auth', ...)` payloads
 * and exposes Authorization-header lookup. Just enough surface for
 * authMiddleware to do its work.
 */
function makeAuthCtx(authHeader?: string): { ctx: Context; getAuthPayload: () => AuthContext | undefined } {
  let stored: AuthContext | undefined;
  const ctx = {
    req: { header: (k: string) => (k === 'Authorization' ? authHeader : undefined) },
    set: (k: string, v: unknown) => {
      if (k === 'auth') stored = v as AuthContext;
    },
  } as unknown as Context;
  return { ctx, getAuthPayload: () => stored };
}

describe('authMiddleware', () => {
  const JWT_SECRET = 'dev-secret-change-me';

  it('rejects requests without a Bearer header', async () => {
    const next = vi.fn();
    const { ctx } = makeAuthCtx(undefined);
    await expect(authMiddleware(ctx, next)).rejects.toThrow(UnauthorizedError);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a session token used as an access token', async () => {
    // A holder of the short-lived role-selection sessionToken must NEVER
    // be able to access protected endpoints. If this guard regresses, an
    // attacker who intercepts a sessionToken could effectively pin a
    // pending-role session as their access credential.
    const sessionToken = jwt.sign(
      { kind: 'role-selection', memberId: '11111111-1111-1111-1111-111111111111' },
      JWT_SECRET,
      { expiresIn: '5m' },
    );
    const next = vi.fn();
    const { ctx } = makeAuthCtx(`Bearer ${sessionToken}`);
    await expect(authMiddleware(ctx, next)).rejects.toThrow(
      /cannot be used as an access token/,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a normal access token and stores the auth payload', async () => {
    const accessToken = jwt.sign(
      {
        memberId: '11111111-1111-1111-1111-111111111111',
        email: 'user@kairos.local',
        systemRole: 'member',
        activeRole: 'member',
        branchId: branchA,
      },
      JWT_SECRET,
      { expiresIn: '15m' },
    );
    const next = vi.fn();
    const { ctx, getAuthPayload } = makeAuthCtx(`Bearer ${accessToken}`);
    await authMiddleware(ctx, next);
    expect(next).toHaveBeenCalledOnce();
    expect(getAuthPayload()?.memberId).toBe('11111111-1111-1111-1111-111111111111');
    expect(getAuthPayload()?.activeRole).toBe('member');
  });
});

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

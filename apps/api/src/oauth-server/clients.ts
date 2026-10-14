import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';
import type { Database, OAuthClient } from '@kairos/database';
import { auditLog, oauthClients, oauthGrants, members, oauthRefreshTokens } from '@kairos/database';
import { ConflictError, NotFoundError, ValidationError } from '@kairos/utils';
import { SECRET_ROTATION_OVERLAP_SECONDS } from './config';
import { randomToken, sha256Hex } from './crypto';
import { validateRedirectUri, type CreateClientInput, type UpdateClientInput } from './schemas';

/** What the admin screen sees. Never includes a secret or its hash. */
export interface ClientDto {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  homepageUrl: string | null;
  privacyUrl: string | null;
  termsUrl: string | null;
  clientType: 'confidential' | 'public';
  redirectUris: string[];
  allowedScopes: string[];
  isTrusted: boolean;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  /** Live grants only. */
  grantCount?: number;
  /** A rotation overlap is running: the previous secret still works. */
  hasPreviousSecret: boolean;
}

export function toClientDto(row: OAuthClient, grantCount?: number): ClientDto {
  return {
    id: row.id,
    clientId: row.clientId,
    name: row.name,
    description: row.description,
    logoUrl: row.logoUrl,
    homepageUrl: row.homepageUrl,
    privacyUrl: row.privacyUrl,
    termsUrl: row.termsUrl,
    clientType: row.clientType as 'confidential' | 'public',
    redirectUris: row.redirectUris,
    allowedScopes: row.allowedScopes,
    isTrusted: row.isTrusted,
    isActive: row.isActive,
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    ...(grantCount === undefined ? {} : { grantCount }),
    hasPreviousSecret: !!row.previousSecretExpiresAt && row.previousSecretExpiresAt > new Date(),
  };
}

function newClientId(): string {
  return `kc_${randomToken(18)}`;
}

function newClientSecret(): string {
  return `ks_${randomToken(32)}`;
}

export async function createClient(
  db: Database,
  actorMemberId: string,
  input: CreateClientInput,
): Promise<{ client: ClientDto; clientSecret: string | null }> {
  const clientSecret = input.clientType === 'confidential' ? newClientSecret() : null;
  const [row] = await db
    .insert(oauthClients)
    .values({
      clientId: newClientId(),
      name: input.name,
      description: input.description ?? null,
      logoUrl: input.logoUrl ?? null,
      homepageUrl: input.homepageUrl ?? null,
      privacyUrl: input.privacyUrl ?? null,
      termsUrl: input.termsUrl ?? null,
      clientType: input.clientType,
      secretHash: clientSecret ? await sha256Hex(clientSecret) : null,
      redirectUris: input.redirectUris,
      allowedScopes: input.allowedScopes,
      isTrusted: input.isTrusted,
      createdByMemberId: actorMemberId,
    })
    .returning();
  if (!row) throw new Error('Client insert returned no row');
  return { client: toClientDto(row, 0), clientSecret };
}

export async function getClientRow(db: Database, id: string): Promise<OAuthClient> {
  const [row] = await db.select().from(oauthClients).where(eq(oauthClients.id, id)).limit(1);
  if (!row) throw new NotFoundError('OAuth client not found');
  return row;
}

export async function listClients(db: Database): Promise<ClientDto[]> {
  const rows = await db.select().from(oauthClients).orderBy(desc(oauthClients.createdAt));
  const counts = await db
    .select({ clientId: oauthGrants.clientId, n: count() })
    .from(oauthGrants)
    .where(isNull(oauthGrants.revokedAt))
    .groupBy(oauthGrants.clientId);
  const byClient = new Map(counts.map((r) => [r.clientId, Number(r.n)]));
  return rows.map((r) => toClientDto(r, byClient.get(r.id) ?? 0));
}

export async function getClient(db: Database, id: string): Promise<ClientDto> {
  const row = await getClientRow(db, id);
  const [{ n } = { n: 0 }] = await db
    .select({ n: count() })
    .from(oauthGrants)
    .where(and(eq(oauthGrants.clientId, id), isNull(oauthGrants.revokedAt)));
  return toClientDto(row, Number(n));
}

export async function updateClient(db: Database, id: string, input: UpdateClientInput): Promise<ClientDto> {
  const existing = await getClientRow(db, id);
  const type = existing.clientType as 'confidential' | 'public';

  if (input.redirectUris) {
    for (const uri of input.redirectUris) {
      const problem = validateRedirectUri(uri, type);
      if (problem) throw new ValidationError(`Redirect URI ${problem}`);
    }
  }
  if (input.allowedScopes && !input.allowedScopes.includes('openid')) {
    throw new ValidationError('The openid scope is required');
  }

  const [row] = await db
    .update(oauthClients)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description || null }),
      ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl ?? null }),
      ...(input.homepageUrl !== undefined && { homepageUrl: input.homepageUrl ?? null }),
      ...(input.privacyUrl !== undefined && { privacyUrl: input.privacyUrl ?? null }),
      ...(input.termsUrl !== undefined && { termsUrl: input.termsUrl ?? null }),
      ...(input.redirectUris !== undefined && { redirectUris: input.redirectUris }),
      ...(input.allowedScopes !== undefined && { allowedScopes: input.allowedScopes }),
      ...(input.isTrusted !== undefined && { isTrusted: input.isTrusted }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      updatedAt: new Date(),
    })
    .where(eq(oauthClients.id, id))
    .returning();
  if (!row) throw new NotFoundError('OAuth client not found');
  return toClientDto(row);
}

/**
 * New secret, shown once. The old one keeps working for a day so a deployment
 * that has not picked up the new value yet does not break mid-rotation.
 */
export async function rotateClientSecret(db: Database, id: string): Promise<{ client: ClientDto; clientSecret: string }> {
  const existing = await getClientRow(db, id);
  if (existing.clientType !== 'confidential') {
    throw new ConflictError('Public clients have no secret to rotate');
  }
  const clientSecret = newClientSecret();
  const [row] = await db
    .update(oauthClients)
    .set({
      secretHash: await sha256Hex(clientSecret),
      previousSecretHash: existing.secretHash,
      previousSecretExpiresAt: new Date(Date.now() + SECRET_ROTATION_OVERLAP_SECONDS * 1000),
      updatedAt: new Date(),
    })
    .where(eq(oauthClients.id, id))
    .returning();
  if (!row) throw new NotFoundError('OAuth client not found');
  return { client: toClientDto(row), clientSecret };
}

/** Ends the overlap early — use it when the old secret is known to be compromised. */
export async function expirePreviousSecret(db: Database, id: string): Promise<ClientDto> {
  const [row] = await db
    .update(oauthClients)
    .set({ previousSecretHash: null, previousSecretExpiresAt: null, updatedAt: new Date() })
    .where(eq(oauthClients.id, id))
    .returning();
  if (!row) throw new NotFoundError('OAuth client not found');
  return toClientDto(row);
}

export async function deleteClient(db: Database, id: string): Promise<{ name: string }> {
  const existing = await getClientRow(db, id);
  // Grants, codes and refresh tokens go with it (ON DELETE CASCADE).
  await db.delete(oauthClients).where(eq(oauthClients.id, id));
  return { name: existing.name };
}

export interface ClientGrantRow {
  grantId: string;
  memberId: string;
  memberName: string;
  email: string;
  scopes: string[];
  connectedAt: string;
  lastUsedAt: string | null;
}

export async function listClientGrants(db: Database, id: string): Promise<ClientGrantRow[]> {
  await getClientRow(db, id);
  const rows = await db
    .select({
      grantId: oauthGrants.id,
      memberId: oauthGrants.memberId,
      firstName: members.firstName,
      lastName: members.lastName,
      email: members.email,
      scopes: oauthGrants.scopes,
      connectedAt: oauthGrants.createdAt,
      lastUsedAt: oauthGrants.lastUsedAt,
    })
    .from(oauthGrants)
    .innerJoin(members, eq(members.id, oauthGrants.memberId))
    .where(and(eq(oauthGrants.clientId, id), isNull(oauthGrants.revokedAt)))
    .orderBy(desc(oauthGrants.createdAt));
  return rows.map((r) => ({
    grantId: r.grantId,
    memberId: r.memberId,
    memberName: `${r.firstName} ${r.lastName}`.trim(),
    email: r.email,
    scopes: r.scopes,
    connectedAt: r.connectedAt.toISOString(),
    lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
  }));
}

/** Revokes every live grant and every refresh token for one client. Returns how many grants ended. */
export async function revokeAllClientGrants(db: Database, id: string): Promise<number> {
  await getClientRow(db, id);
  const now = new Date();
  const ended = await db
    .update(oauthGrants)
    .set({ revokedAt: now, updatedAt: now })
    .where(and(eq(oauthGrants.clientId, id), isNull(oauthGrants.revokedAt)))
    .returning({ id: oauthGrants.id });
  if (ended.length > 0) {
    await db
      .update(oauthRefreshTokens)
      .set({ revokedAt: now })
      .where(
        and(
          isNull(oauthRefreshTokens.revokedAt),
          sql`${oauthRefreshTokens.grantId} IN (SELECT id FROM oauth_grants WHERE client_id = ${id})`,
        ),
      );
  }
  return ended.length;
}

export interface ClientActivityRow {
  id: string;
  action: string;
  outcome: string;
  actorName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/** The audit trail for one client: grants, token issues, failures, reuse and admin changes. */
export async function listClientActivity(db: Database, id: string, limit = 100): Promise<ClientActivityRow[]> {
  await getClientRow(db, id);
  const rows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      outcome: auditLog.outcome,
      firstName: members.firstName,
      lastName: members.lastName,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .leftJoin(members, eq(members.id, auditLog.actorMemberId))
    .where(and(eq(auditLog.targetType, 'oauth_client'), eq(auditLog.targetId, id)))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    outcome: r.outcome,
    actorName: r.firstName ? `${r.firstName} ${r.lastName ?? ''}`.trim() : null,
    metadata: (r.metadata as Record<string, unknown> | null) ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

import { and, desc, eq } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { auditLog, type NewAuditLogEntry } from '@kairos/database';
import {
  AuditAction,
  AuditOutcome,
  type AuditLogRow,
} from '@kairos/types';
import { getLoggerContext, logger } from '@kairos/utils';

/**
 * Request context extracted from Cloudflare headers (or process.env fallback
 * in dev / tests). Pass undefined for fields the caller can't resolve.
 */
export interface RequestContext {
  ip?: string;
  userAgent?: string;
  country?: string;
}

export interface RecordAuditInput {
  actorMemberId?: string | null;
  action: AuditAction;
  outcome: AuditOutcome;
  targetType?: string;
  targetId?: string;
  attemptedEmail?: string;
  metadata?: Record<string, unknown>;
  ctx?: RequestContext;
}

/**
 * Persist a single audit_log row. Fire-and-forget at call sites; failures
 * are logged and swallowed so audit-capture cannot break the user-facing
 * action it's observing.
 */
export async function recordAuditEvent(db: Database, input: RecordAuditInput): Promise<void> {
  // Fall back to the AsyncLocalStorage logger context — the logging middleware
  // stashes ip / userAgent / country there once per request so services don't
  // have to thread them through every call signature.
  const fallback = getLoggerContext();
  const ip = input.ctx?.ip ?? (fallback?.['ip'] as string | undefined) ?? null;
  const userAgent =
    input.ctx?.userAgent ?? (fallback?.['userAgent'] as string | undefined) ?? null;
  const country =
    input.ctx?.country ?? (fallback?.['country'] as string | undefined) ?? null;

  const row: NewAuditLogEntry = {
    actorMemberId: input.actorMemberId ?? null,
    action: input.action,
    outcome: input.outcome,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    ip,
    userAgent: userAgent ? userAgent.slice(0, 500) : null,
    country,
    attemptedEmail: input.attemptedEmail ?? null,
    metadata: (input.metadata ?? null) as NewAuditLogEntry['metadata'],
  };

  try {
    await db.insert(auditLog).values(row);
  } catch (err) {
    logger.error('audit: insert failed', {
      action: input.action,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Last 50 audit entries belonging to a member, newest first. Used by
 * /profile/settings/security to show "your recent activity."
 */
export async function listMyAuditLog(db: Database, memberId: string): Promise<AuditLogRow[]> {
  const rows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      outcome: auditLog.outcome,
      ip: auditLog.ip,
      userAgent: auditLog.userAgent,
      country: auditLog.country,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(and(eq(auditLog.actorMemberId, memberId), eq(auditLog.isActive, true)))
    .orderBy(desc(auditLog.createdAt))
    .limit(50);

  return rows.map((r) => ({
    id: r.id,
    action: r.action as AuditAction,
    outcome: r.outcome as AuditOutcome,
    ip: r.ip,
    userAgent: r.userAgent,
    country: r.country,
    metadata: (r.metadata ?? null) as Record<string, unknown> | null,
    createdAt: r.createdAt.toISOString(),
  }));
}

/**
 * Has this member ever signed in successfully from this user-agent? Used by
 * the new-device-signin notification trigger. We compare full UA strings —
 * any change (browser update, OS bump) counts as a new device, which is
 * acceptable for v1 alerting.
 */
export async function hasPriorSigninFromUserAgent(
  db: Database,
  memberId: string,
  userAgent: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: auditLog.id })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.actorMemberId, memberId),
        eq(auditLog.action, AuditAction.SigninSuccess),
        eq(auditLog.outcome, AuditOutcome.Success),
        eq(auditLog.userAgent, userAgent),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

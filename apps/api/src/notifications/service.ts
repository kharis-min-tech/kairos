import { and, eq, inArray } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  members,
  notificationEvents,
  notificationPreferences,
  type NewNotificationEvent,
} from '@kairos/database';
import {
  NOTIFICATION_DEFAULT_CADENCE,
  NotificationCategory,
  NotificationCadence,
  type NotificationEventType,
} from '@kairos/types';
import { logger, sendNotificationEmail } from '@kairos/utils';
import { TEMPLATE_REGISTRY } from './template-registry';

/**
 * Effective preference for a (member, category) pair. `enabled` and `cadence`
 * are the resolved values after merging defaults + stored row.
 */
interface EffectivePreference {
  category: NotificationCategory;
  enabled: boolean;
  cadence: NotificationCadence;
}

/**
 * Resolve preferences for a list of members + a single category. Members
 * without a stored row get the default. Security is always enabled.
 */
async function loadPreferences(
  db: Database,
  memberIds: string[],
  category: NotificationCategory,
): Promise<Map<string, EffectivePreference>> {
  const out = new Map<string, EffectivePreference>();
  if (memberIds.length === 0) return out;

  const rows = await db
    .select({
      memberId: notificationPreferences.memberId,
      enabled: notificationPreferences.enabled,
      cadence: notificationPreferences.cadence,
    })
    .from(notificationPreferences)
    .where(
      and(
        inArray(notificationPreferences.memberId, memberIds),
        eq(notificationPreferences.category, category),
        eq(notificationPreferences.isActive, true),
      ),
    );

  const stored = new Map(rows.map((r) => [r.memberId, r]));
  const defaultCadence = NOTIFICATION_DEFAULT_CADENCE[category];

  for (const memberId of memberIds) {
    const row = stored.get(memberId);
    if (category === NotificationCategory.Security) {
      out.set(memberId, { category, enabled: true, cadence: 'immediate' });
      continue;
    }
    out.set(memberId, {
      category,
      enabled: row ? row.enabled : true,
      cadence: ((row?.cadence as NotificationCadence | undefined) ?? defaultCadence) as NotificationCadence,
    });
  }
  return out;
}

interface RecipientRow {
  id: string;
  email: string;
  firstName: string;
  isActive: boolean;
}

async function loadRecipients(db: Database, memberIds: string[]): Promise<RecipientRow[]> {
  if (memberIds.length === 0) return [];
  return db
    .select({
      id: members.id,
      email: members.email,
      firstName: members.firstName,
      isActive: members.isActive,
    })
    .from(members)
    .where(inArray(members.id, memberIds));
}

export interface DispatchInput {
  eventType: NotificationEventType;
  recipientMemberIds: string[];
  payload: Record<string, unknown>;
  subjectType?: string;
  subjectId?: string;
  branchId?: string;
}

/**
 * Fan an event out to its resolved recipients. Honours per-member preferences
 * (security always on); for `immediate` cadence sends via SES; for
 * `digest_daily` queues a row to be batched by the daily digest cron.
 *
 * Fire-and-forget at call sites — errors are caught and logged. Callers must
 * not let notification failures break the user-facing flow they're inside.
 */
export async function dispatchNotification(
  db: Database,
  input: DispatchInput,
): Promise<void> {
  const tpl = TEMPLATE_REGISTRY[input.eventType];
  if (!tpl) {
    logger.warn('notification: unknown event type', { eventType: input.eventType });
    return;
  }

  const uniqueRecipients = Array.from(new Set(input.recipientMemberIds));
  if (uniqueRecipients.length === 0) return;

  try {
    const [recipients, prefs] = await Promise.all([
      loadRecipients(db, uniqueRecipients),
      loadPreferences(db, uniqueRecipients, tpl.category),
    ]);

    const activeRecipients = recipients.filter((r) => r.isActive && r.email);

    for (const r of activeRecipients) {
      const pref = prefs.get(r.id);
      if (!pref || !pref.enabled) continue;

      const baseEvent: NewNotificationEvent = {
        memberId: r.id,
        category: tpl.category,
        eventType: input.eventType,
        subjectType: input.subjectType ?? null,
        subjectId: input.subjectId ?? null,
        payload: input.payload as NewNotificationEvent['payload'],
        branchId: input.branchId ?? null,
      };

      if (pref.cadence === NotificationCadence.DigestDaily) {
        await db.insert(notificationEvents).values(baseEvent);
        continue;
      }

      const personalisedPayload = { memberName: r.firstName, ...input.payload };
      const rendered = tpl.render(personalisedPayload);
      try {
        await sendNotificationEmail(r.email, rendered.subject, rendered.html);
        await db.insert(notificationEvents).values({ ...baseEvent, sentAt: new Date() });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('notification: send failed', {
          eventType: input.eventType,
          memberId: r.id,
          error: message,
        });
        await db.insert(notificationEvents).values({
          ...baseEvent,
          sentAt: new Date(),
          sendError: message,
        });
      }
    }
  } catch (err) {
    logger.error('notification: dispatch failed', {
      eventType: input.eventType,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ── Preferences CRUD (for /settings/notifications) ─────────────

export async function listEffectivePreferences(
  db: Database,
  memberId: string,
): Promise<EffectivePreference[]> {
  const stored = await db
    .select({
      category: notificationPreferences.category,
      enabled: notificationPreferences.enabled,
      cadence: notificationPreferences.cadence,
    })
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.memberId, memberId),
        eq(notificationPreferences.isActive, true),
      ),
    );

  const storedMap = new Map(stored.map((r) => [r.category as NotificationCategory, r]));
  const out: EffectivePreference[] = [];
  for (const category of Object.values(NotificationCategory)) {
    const row = storedMap.get(category);
    if (category === NotificationCategory.Security) {
      out.push({ category, enabled: true, cadence: 'immediate' });
      continue;
    }
    out.push({
      category,
      enabled: row ? row.enabled : true,
      cadence: ((row?.cadence as NotificationCadence | undefined) ?? NOTIFICATION_DEFAULT_CADENCE[category]) as NotificationCadence,
    });
  }
  return out;
}

export async function upsertPreference(
  db: Database,
  memberId: string,
  patch: { category: NotificationCategory; enabled: boolean; cadence: NotificationCadence },
): Promise<EffectivePreference> {
  if (patch.category === NotificationCategory.Security) {
    return { category: patch.category, enabled: true, cadence: 'immediate' };
  }

  const existing = await db
    .select({ id: notificationPreferences.id })
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.memberId, memberId),
        eq(notificationPreferences.category, patch.category),
        eq(notificationPreferences.isActive, true),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(notificationPreferences)
      .set({
        enabled: patch.enabled,
        cadence: patch.cadence,
        updatedAt: new Date(),
      })
      .where(eq(notificationPreferences.id, existing[0]!.id));
  } else {
    await db.insert(notificationPreferences).values({
      memberId,
      category: patch.category,
      enabled: patch.enabled,
      cadence: patch.cadence,
    });
  }

  return { category: patch.category, enabled: patch.enabled, cadence: patch.cadence };
}

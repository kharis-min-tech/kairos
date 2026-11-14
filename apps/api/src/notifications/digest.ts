import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  members,
  notificationEvents,
} from '@kairos/database';
import {
  NOTIFICATION_CATEGORY_LABEL,
  type NotificationCategory,
} from '@kairos/types';
import { logger, sendNotificationEmail } from '@kairos/utils';
import { TEMPLATE_REGISTRY } from './template-registry';

interface PendingRow {
  id: string;
  memberId: string;
  category: string;
  eventType: string;
  payload: unknown;
}

interface PendingForMember {
  memberId: string;
  email: string;
  firstName: string;
  isActive: boolean;
  byCategory: Map<NotificationCategory, PendingRow[]>;
}

/**
 * Daily digest cron. Picks up every `notification_events` row queued with
 * `sent_at IS NULL`, groups by recipient + category, renders one digest
 * email per (member, category), sends via SES, and marks all rows in the
 * batch as sent.
 *
 * Idempotent within a run — if a send fails, the rows stay unsent and will
 * be retried tomorrow. The batch_id correlates rows that were sent together.
 */
export async function runDailyDigest(db: Database): Promise<{
  digests: number;
  events: number;
}> {
  const pending = await db
    .select({
      id: notificationEvents.id,
      memberId: notificationEvents.memberId,
      category: notificationEvents.category,
      eventType: notificationEvents.eventType,
      payload: notificationEvents.payload,
    })
    .from(notificationEvents)
    .where(
      and(
        isNull(notificationEvents.sentAt),
        eq(notificationEvents.isActive, true),
      ),
    )
    .orderBy(asc(notificationEvents.createdAt))
    .limit(5000);

  if (pending.length === 0) {
    logger.info('digest.empty', { module: 'cron', action: 'digest' });
    return { digests: 0, events: 0 };
  }

  const memberIds = Array.from(new Set(pending.map((r) => r.memberId)));
  const recipients = await db
    .select({
      id: members.id,
      email: members.email,
      firstName: members.firstName,
      isActive: members.isActive,
    })
    .from(members)
    .where(inArray(members.id, memberIds));

  const byMember = new Map<string, PendingForMember>();
  for (const r of recipients) {
    byMember.set(r.id, {
      memberId: r.id,
      email: r.email,
      firstName: r.firstName,
      isActive: r.isActive,
      byCategory: new Map(),
    });
  }
  for (const row of pending) {
    const entry = byMember.get(row.memberId);
    if (!entry) continue; // recipient deleted between insert and digest run
    const cat = row.category as NotificationCategory;
    const list = entry.byCategory.get(cat) ?? [];
    list.push(row);
    entry.byCategory.set(cat, list);
  }

  let digestsSent = 0;
  let eventsCovered = 0;

  for (const member of byMember.values()) {
    if (!member.isActive || !member.email) {
      // Skip silently but mark these rows expired so we don't retry forever.
      const expiredIds = Array.from(member.byCategory.values()).flat().map((r) => r.id);
      if (expiredIds.length > 0) {
        await db
          .update(notificationEvents)
          .set({
            sentAt: new Date(),
            sendError: 'recipient inactive or missing email',
            updatedAt: new Date(),
          })
          .where(inArray(notificationEvents.id, expiredIds));
      }
      continue;
    }
    for (const [category, rows] of member.byCategory.entries()) {
      const batchId = crypto.randomUUID();
      const rendered = renderDigest(category, member.firstName, rows);
      try {
        await sendNotificationEmail(member.email, rendered.subject, rendered.html);
        await db
          .update(notificationEvents)
          .set({
            sentAt: new Date(),
            batchId,
            updatedAt: new Date(),
          })
          .where(inArray(notificationEvents.id, rows.map((r) => r.id)));
        digestsSent += 1;
        eventsCovered += rows.length;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('digest.send_failed', {
          module: 'cron',
          action: 'digest',
          memberId: member.memberId,
          category,
          eventCount: rows.length,
          error: message,
        });
        // Don't mark sent — they'll roll into tomorrow's batch.
      }
    }
  }

  logger.info('digest.completed', {
    module: 'cron',
    action: 'digest',
    digests: digestsSent,
    events: eventsCovered,
    pending: pending.length,
  });

  return { digests: digestsSent, events: eventsCovered };
}

interface DigestRendered {
  subject: string;
  html: string;
}

function renderDigest(
  category: NotificationCategory,
  recipientFirstName: string,
  rows: PendingRow[],
): DigestRendered {
  const categoryLabel = NOTIFICATION_CATEGORY_LABEL[category];
  const lines = rows.map((row) => {
    const tpl = TEMPLATE_REGISTRY[row.eventType];
    if (!tpl) return `(${row.eventType})`;
    try {
      const payloadWithName = { memberName: recipientFirstName, ...(row.payload as object) };
      return tpl.digestLine(payloadWithName);
    } catch {
      return `(${row.eventType})`;
    }
  });

  const subject = `Your ${categoryLabel} digest: ${rows.length} update${rows.length === 1 ? '' : 's'}`;
  const bullets = lines
    .map((line) => `<li style="margin: 6px 0;">${escapeHtml(line)}</li>`)
    .join('');
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #5D3FD3;">${escapeHtml(categoryLabel)} digest</h2>
      <p>Hi ${escapeHtml(recipientFirstName)},</p>
      <p>Here's a summary of <strong>${rows.length}</strong>
         ${escapeHtml(categoryLabel.toLowerCase())} update${rows.length === 1 ? '' : 's'}
         from the last 24 hours.</p>
      <ul style="line-height:1.7;">${bullets}</ul>
      <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
      <p style="font-size:12px;color:#6b7280;">
        Adjust digest cadence on the Notifications page in Profile → Settings.
      </p>
    </div>
  `;

  return { subject, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Re-export raw `sql` no-op so the import isn't dropped if optimised away
// in builds (kept for future SQL-fragment use).
export const __sqlMarker = sql`SELECT 1`;

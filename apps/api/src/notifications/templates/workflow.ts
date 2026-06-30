/**
 * Workflow category templates. Phase 4 wires:
 *   - fellowship join request received / decided
 *   - department join request received / decided
 *   - soul assigned + status changed
 *   - new believer stage moved
 *
 * Routed via NotificationCategory.Workflow — default cadence is daily digest
 * so a leader doesn't get an email per record. Users can override per
 * category from /profile/settings/notifications.
 */

import { renderLayout, escapeHtml } from './_layout';

export interface JoinRequestReceivedPayload {
  memberName: string;
  requesterName: string;
  targetName: string;
  targetKind: 'fellowship' | 'department';
  portalUrl: string;
}

export function renderJoinRequestReceived(p: JoinRequestReceivedPayload) {
  const targetLabel = p.targetKind === 'fellowship' ? 'fellowship' : 'department';
  return {
    subject: `New ${targetLabel} join request — ${p.targetName}`,
    html: renderLayout({
      heading: `New ${targetLabel} join request`,
      greeting: p.memberName,
      bodyHtml: `
        <p><strong>${escapeHtml(p.requesterName)}</strong> has requested to join
           <strong>${escapeHtml(p.targetName)}</strong>.</p>
        <p>Review the request in the portal to approve or decline.</p>
      `,
      cta: { label: 'Review request', url: p.portalUrl },
    }),
  };
}

export interface JoinRequestDecidedPayload {
  memberName: string;
  targetName: string;
  targetKind: 'fellowship' | 'department';
  decision: 'approved' | 'rejected';
  portalUrl: string;
}

export function renderJoinRequestDecided(p: JoinRequestDecidedPayload) {
  const approved = p.decision === 'approved';
  const subject = approved
    ? `You've been added to ${p.targetName}`
    : `Update on your ${p.targetKind} request`;
  return {
    subject,
    html: renderLayout({
      heading: approved ? 'Request approved' : 'Request reviewed',
      greeting: p.memberName,
      bodyHtml: approved
        ? `<p>Welcome — your request to join <strong>${escapeHtml(p.targetName)}</strong>
             has been approved.</p>`
        : `<p>Thank you for your interest in <strong>${escapeHtml(p.targetName)}</strong>.
             After review, we weren't able to approve your request at this time.
             Please reach out to your branch leadership with any questions.</p>`,
      cta: { label: 'Open portal', url: p.portalUrl },
    }),
  };
}

export interface SoulAssignedPayload {
  memberName: string;
  soulName: string;
  assignedByName: string | null;
  portalUrl: string;
}

export function renderSoulAssigned(p: SoulAssignedPayload) {
  const actor = p.assignedByName ? ` by ${escapeHtml(p.assignedByName)}` : '';
  return {
    subject: `Soul assigned to you — ${p.soulName}`,
    html: renderLayout({
      heading: 'Soul assigned to you',
      greeting: p.memberName,
      bodyHtml: `
        <p>You've been assigned to follow up with <strong>${escapeHtml(p.soulName)}</strong>${actor}.</p>
        <p>Open their record in the portal to start the conversation.</p>
      `,
      cta: { label: 'Open soul', url: p.portalUrl },
    }),
  };
}

export interface SoulStatusChangedPayload {
  memberName: string;
  soulName: string;
  fromStatus: string;
  toStatus: string;
  changedByName: string | null;
  portalUrl: string;
}

export function renderSoulStatusChanged(p: SoulStatusChangedPayload) {
  const actor = p.changedByName ? ` by ${escapeHtml(p.changedByName)}` : '';
  return {
    subject: `Soul status updated — ${p.soulName}`,
    html: renderLayout({
      heading: 'Soul status updated',
      greeting: p.memberName,
      bodyHtml: `
        <p><strong>${escapeHtml(p.soulName)}</strong> moved from
           <strong>${escapeHtml(p.fromStatus)}</strong> to
           <strong>${escapeHtml(p.toStatus)}</strong>${actor}.</p>
      `,
      cta: { label: 'Open soul', url: p.portalUrl },
    }),
  };
}

export interface NewBelieverStageMovedPayload {
  memberName: string;
  studentName: string;
  fromStage: string;
  toStage: string;
  changedByName: string | null;
  portalUrl: string;
}

export function renderNewBelieverStageMoved(p: NewBelieverStageMovedPayload) {
  const actor = p.changedByName ? ` by ${escapeHtml(p.changedByName)}` : '';
  return {
    subject: `New believer stage updated — ${p.studentName}`,
    html: renderLayout({
      heading: 'New believer stage updated',
      greeting: p.memberName,
      bodyHtml: `
        <p><strong>${escapeHtml(p.studentName)}</strong> moved from
           <strong>${escapeHtml(p.fromStage)}</strong> to
           <strong>${escapeHtml(p.toStage)}</strong>${actor}.</p>
      `,
      cta: { label: 'Open profile', url: p.portalUrl },
    }),
  };
}

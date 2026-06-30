/**
 * Lifecycle category templates. Phase 5 wires:
 *   - visitor_promoted (cron — visitor → attendee after ≥6 services / 90 days)
 *   - child_aged_out (cron — child → attendee at age 16)
 *   - member_confirmed (admin marks membership class complete)
 *
 * Routed via NotificationCategory.Lifecycle — default cadence is daily
 * digest to keep the inbox quiet.
 */

import { renderLayout, escapeHtml } from './_layout';

export interface LifecycleVisitorPromotedPayload {
  memberName: string;
  visitorName: string;
  branchName: string;
  portalUrl: string;
}

export function renderVisitorPromoted(p: LifecycleVisitorPromotedPayload) {
  return {
    subject: `Visitor promoted to attendee — ${p.visitorName}`,
    html: renderLayout({
      heading: 'Visitor promoted to attendee',
      greeting: p.memberName,
      bodyHtml: `
        <p><strong>${escapeHtml(p.visitorName)}</strong> has been promoted from
           visitor to attendee in <strong>${escapeHtml(p.branchName)}</strong>
           after attending ≥6 services in the last 90 days.</p>
      `,
      cta: { label: 'Open profile', url: p.portalUrl },
    }),
  };
}

export interface LifecycleChildAgedOutPayload {
  memberName: string;
  childName: string;
  branchName: string;
  portalUrl: string;
}

export function renderChildAgedOut(p: LifecycleChildAgedOutPayload) {
  return {
    subject: `Child aged out — ${p.childName}`,
    html: renderLayout({
      heading: 'Child aged out (16+)',
      greeting: p.memberName,
      bodyHtml: `
        <p><strong>${escapeHtml(p.childName)}</strong> has aged out of the
           child cohort in <strong>${escapeHtml(p.branchName)}</strong> and
           been moved to attendee.</p>
        <p>Safeguarding records have NOT been deleted. Review with the
           Safeguarding Lead if needed.</p>
      `,
      cta: { label: 'Open profile', url: p.portalUrl },
    }),
  };
}

export interface LifecycleMemberConfirmedPayload {
  memberName: string;
  confirmedName: string;
  branchName: string;
  portalUrl: string;
}

export function renderMemberConfirmed(p: LifecycleMemberConfirmedPayload) {
  return {
    subject: `New confirmed Member — ${p.confirmedName}`,
    html: renderLayout({
      heading: 'New confirmed Member',
      greeting: p.memberName,
      bodyHtml: `
        <p><strong>${escapeHtml(p.confirmedName)}</strong> has completed the
           4-week membership class in <strong>${escapeHtml(p.branchName)}</strong>
           and is now a confirmed Member.</p>
      `,
      cta: { label: 'Open profile', url: p.portalUrl },
    }),
  };
}

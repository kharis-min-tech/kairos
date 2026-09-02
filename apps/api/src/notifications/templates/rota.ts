/**
 * Rota + uniform category templates. Phase 5 wires:
 *   - assignment_confirmed (rota instance confirmed for upcoming service)
 *   - swap_requested (member requests to swap their slot)
 *   - uniform.schedule_set (department uniform set for a date)
 *
 * Default cadence: immediate for rota + uniform (personally relevant).
 */

import { renderLayout, escapeHtml } from './_layout';

export interface RotaAssignmentConfirmedPayload {
  memberName: string;
  templateName: string;
  serviceDate: string;
  slotRoleName: string;
  portalUrl: string;
}

export function renderRotaAssignmentConfirmed(p: RotaAssignmentConfirmedPayload) {
  return {
    subject: `Rota confirmed: ${p.templateName} on ${p.serviceDate}`,
    html: renderLayout({
      heading: 'Rota assignment confirmed',
      greeting: p.memberName,
      bodyHtml: `
        <p>You're confirmed for <strong>${escapeHtml(p.slotRoleName)}</strong>
           on the <strong>${escapeHtml(p.templateName)}</strong> rota for
           <strong>${escapeHtml(p.serviceDate)}</strong>.</p>
        <p>If you can't make it, request a swap from your rota page.</p>
      `,
      cta: { label: 'Open rota', url: p.portalUrl },
    }),
  };
}

export interface RotaSwapRequestedPayload {
  memberName: string;
  requesterName: string;
  templateName: string;
  serviceDate: string;
  portalUrl: string;
}

export function renderRotaSwapRequested(p: RotaSwapRequestedPayload) {
  return {
    subject: `Rota swap requested: ${p.templateName} on ${p.serviceDate}`,
    html: renderLayout({
      heading: 'Rota swap requested',
      greeting: p.memberName,
      bodyHtml: `
        <p><strong>${escapeHtml(p.requesterName)}</strong> has requested a swap
           for the <strong>${escapeHtml(p.templateName)}</strong> rota on
           <strong>${escapeHtml(p.serviceDate)}</strong>.</p>
        <p>Review the request in the portal.</p>
      `,
      cta: { label: 'Open swap request', url: p.portalUrl },
    }),
  };
}

export interface UniformScheduleSetPayload {
  memberName: string;
  departmentName: string;
  serviceDate: string;
  outfitName: string;
  portalUrl: string;
}

export function renderUniformScheduleSet(p: UniformScheduleSetPayload) {
  return {
    subject: `Uniform set: ${p.departmentName} on ${p.serviceDate}`,
    html: renderLayout({
      heading: 'Uniform set for upcoming service',
      greeting: p.memberName,
      bodyHtml: `
        <p>The uniform for <strong>${escapeHtml(p.departmentName)}</strong> on
           <strong>${escapeHtml(p.serviceDate)}</strong> is
           <strong>${escapeHtml(p.outfitName)}</strong>.</p>
      `,
      cta: { label: 'Open department', url: p.portalUrl },
    }),
  };
}

// ── Digest lines ──

export function digestRotaAssignmentConfirmed(p: RotaAssignmentConfirmedPayload): string {
  return `Rota: ${p.templateName}, ${p.slotRoleName} on ${p.serviceDate}`;
}

export function digestRotaSwapRequested(p: RotaSwapRequestedPayload): string {
  return `Swap requested: ${p.requesterName} on ${p.templateName} (${p.serviceDate})`;
}

export function digestUniformScheduleSet(p: UniformScheduleSetPayload): string {
  return `Uniform: ${p.departmentName} on ${p.serviceDate}, ${p.outfitName}`;
}

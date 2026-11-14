/**
 * Security category templates. Phase 1 wires:
 *   - password_reset_requested
 *   - password_changed
 *   - role_granted
 *   - role_revoked
 *
 * Each renderer takes a typed payload and returns { subject, html }. The
 * dispatcher in ../service.ts looks up the renderer via the event-type key
 * in ../template-registry.ts.
 */

import { renderLayout, escapeHtml } from './_layout';

export interface SecurityPasswordResetRequestedPayload {
  memberName: string;
  resetLink: string;
}

export function renderPasswordResetRequested(p: SecurityPasswordResetRequestedPayload) {
  return {
    subject: 'Reset Your Password | Kharis Church',
    html: renderLayout({
      heading: 'Password reset requested',
      greeting: p.memberName,
      bodyHtml: `
        <p>We received a request to reset your Kharis Church account password.
           Click the button below to set a new password. This link expires in
           <strong>1 hour</strong>.</p>
        <p style="word-break:break-all;color:#5D3FD3;font-size:12px;">
          If the button doesn't work, copy this link: ${escapeHtml(p.resetLink)}
        </p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
      `,
      cta: { label: 'Reset Password', url: p.resetLink },
    }),
  };
}

export interface SecurityPasswordChangedPayload {
  memberName: string;
  occurredAt: Date;
  loginUrl: string;
}

export function renderPasswordChanged(p: SecurityPasswordChangedPayload) {
  const when = p.occurredAt.toLocaleString('en-GB');
  return {
    subject: 'Your password was changed',
    html: renderLayout({
      heading: 'Password changed',
      greeting: p.memberName,
      bodyHtml: `
        <p>Your Kharis Church account password was changed on
           <strong>${escapeHtml(when)}</strong>.</p>
        <p>If this was you, no action is needed.</p>
        <p>If you didn't make this change, sign in immediately and reset your
           password, then contact your branch administrator.</p>
      `,
      cta: { label: 'Sign in', url: p.loginUrl },
    }),
  };
}

export interface SecurityRoleGrantedPayload {
  memberName: string;
  roleName: string;
  scopeLabel: string;
  grantedByName: string | null;
  portalUrl: string;
}

export function renderRoleGranted(p: SecurityRoleGrantedPayload) {
  const actor = p.grantedByName ? ` by ${escapeHtml(p.grantedByName)}` : '';
  return {
    subject: `Role assigned: ${p.roleName}`,
    html: renderLayout({
      heading: 'New role assigned',
      greeting: p.memberName,
      bodyHtml: `
        <p>You have been assigned the <strong>${escapeHtml(p.roleName)}</strong> role
           for <strong>${escapeHtml(p.scopeLabel)}</strong>${actor}.</p>
        <p>Log in to the portal to see what's now available to you.</p>
      `,
      cta: { label: 'Open portal', url: p.portalUrl },
    }),
  };
}

export interface SecuritySigninNewDevicePayload {
  memberName: string;
  occurredAt: Date;
  ip: string | null;
  country: string | null;
  userAgent: string | null;
}

export function renderSigninNewDevice(p: SecuritySigninNewDevicePayload) {
  const when = p.occurredAt.toLocaleString('en-GB');
  const locationLine = [p.country, p.ip].filter(Boolean).join(' · ');
  return {
    subject: 'New sign-in to your Kharis Church account',
    html: renderLayout({
      heading: 'New sign-in detected',
      greeting: p.memberName,
      bodyHtml: `
        <p>Your Kharis Church account was signed in to from a device we haven't
           seen before.</p>
        <ul style="line-height:1.7;">
          <li><strong>When:</strong> ${escapeHtml(when)}</li>
          ${locationLine ? `<li><strong>Where:</strong> ${escapeHtml(locationLine)}</li>` : ''}
          ${p.userAgent ? `<li><strong>Device:</strong> ${escapeHtml(p.userAgent)}</li>` : ''}
        </ul>
        <p>If this was you, no action is needed.</p>
        <p>If you don't recognise this sign-in, change your password immediately
           and contact your branch administrator.</p>
      `,
    }),
  };
}

export interface SecurityOAuthProviderLinkedPayload {
  memberName: string;
  providerLabel: string;
  occurredAt: Date;
  securityUrl: string;
}

export function renderOAuthProviderLinked(p: SecurityOAuthProviderLinkedPayload) {
  const when = p.occurredAt.toLocaleString('en-GB');
  return {
    subject: `New sign-in method added to your Kharis account`,
    html: renderLayout({
      heading: 'New sign-in method added',
      greeting: p.memberName,
      bodyHtml: `
        <p>You signed in to Kairos with <strong>${escapeHtml(p.providerLabel)}</strong>
           for the first time on <strong>${escapeHtml(when)}</strong>. That
           provider is now linked to your Kharis Church account, so you can
           use it to sign in again in the future.</p>
        <p>If this was you, no action is needed.</p>
        <p>If this wasn't you, secure your account by changing your password
           and disconnecting the provider from your security settings.</p>
      `,
      cta: { label: 'Review account security', url: p.securityUrl },
    }),
  };
}

export function digestOAuthProviderLinked(p: SecurityOAuthProviderLinkedPayload): string {
  return `New sign-in method linked: ${p.providerLabel}`;
}

export interface SecurityRoleRevokedPayload {
  memberName: string;
  roleName: string;
  scopeLabel: string;
  revokedByName: string | null;
  portalUrl: string;
}

export function renderRoleRevoked(p: SecurityRoleRevokedPayload) {
  const actor = p.revokedByName ? ` by ${escapeHtml(p.revokedByName)}` : '';
  return {
    subject: `Role removed: ${p.roleName}`,
    html: renderLayout({
      heading: 'Role removed',
      greeting: p.memberName,
      bodyHtml: `
        <p>Your <strong>${escapeHtml(p.roleName)}</strong> role for
           <strong>${escapeHtml(p.scopeLabel)}</strong> has been removed${actor}.</p>
        <p>If you believe this was a mistake, please contact your branch administrator.</p>
      `,
      cta: { label: 'Open portal', url: p.portalUrl },
    }),
  };
}

export interface SecurityProfileUpdatedByAdminPayload {
  memberName: string;
  updatedByName: string | null;
  changedFieldLabels: string[];
  occurredAt: Date;
  portalUrl: string;
}

export function renderProfileUpdatedByAdmin(p: SecurityProfileUpdatedByAdminPayload) {
  const when = p.occurredAt.toLocaleString('en-GB');
  const actor = p.updatedByName ? escapeHtml(p.updatedByName) : 'a branch administrator';
  const fieldList = p.changedFieldLabels.length
    ? `<ul style="line-height:1.7;">${p.changedFieldLabels
        .map((f) => `<li>${escapeHtml(f)}</li>`)
        .join('')}</ul>`
    : '';
  return {
    subject: 'Your profile was updated',
    html: renderLayout({
      heading: 'Profile updated by a leader',
      greeting: p.memberName,
      bodyHtml: `
        <p>Your Kharis Church profile was updated on
           <strong>${escapeHtml(when)}</strong> by <strong>${actor}</strong>.</p>
        <p>The following fields changed:</p>
        ${fieldList}
        <p>If you were expecting this change (for example, a leader tidied up
           your contact details after speaking with you), no action is needed.</p>
        <p>If this wasn't expected, sign in to review your profile and contact
           your branch administrator.</p>
      `,
      cta: { label: 'Review profile', url: p.portalUrl },
    }),
  };
}

// ── Digest lines (security defaults to immediate but supported for completeness) ──

export function digestPasswordResetRequested(_p: SecurityPasswordResetRequestedPayload): string {
  return 'Password reset requested';
}

export function digestPasswordChanged(p: SecurityPasswordChangedPayload): string {
  return `Password changed at ${p.occurredAt.toLocaleString('en-GB')}`;
}

export function digestRoleGranted(p: SecurityRoleGrantedPayload): string {
  return `Role granted: ${p.roleName} (${p.scopeLabel})`;
}

export function digestRoleRevoked(p: SecurityRoleRevokedPayload): string {
  return `Role removed: ${p.roleName} (${p.scopeLabel})`;
}

export function digestSigninNewDevice(p: SecuritySigninNewDevicePayload): string {
  const where = [p.country, p.ip].filter(Boolean).join(' · ');
  return `Sign-in from new device${where ? ` (${where})` : ''}`;
}

export function digestProfileUpdatedByAdmin(p: SecurityProfileUpdatedByAdminPayload): string {
  const who = p.updatedByName ?? 'an administrator';
  return `Profile updated by ${who}: ${p.changedFieldLabels.join(', ')}`;
}

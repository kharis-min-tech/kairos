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

/**
 * Each renderer pairs with a `digestLine(payload)` returning a short bullet
 * line for the daily digest cron. Lines are concatenated under a "Workflow"
 * heading when the user opts a category into digest cadence.
 */

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
    subject: `New ${targetLabel} join request: ${p.targetName}`,
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
        ? `<p>Welcome. Your request to join <strong>${escapeHtml(p.targetName)}</strong>
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
    subject: `Soul assigned to you: ${p.soulName}`,
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
    subject: `Soul status updated: ${p.soulName}`,
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
    subject: `New believer stage updated: ${p.studentName}`,
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

export interface NewBelieverRemovedPayload {
  memberName: string;
  studentName: string;
  reason: string;
  notes: string | null;
  removedByName: string | null;
  portalUrl: string;
}

const REMOVAL_REASON_LABELS: Record<string, string> = {
  awol: 'went AWOL',
  withdrew: 'withdrew',
  moved_away: 'moved away',
  stopped_attending: 'stopped attending',
  other: 'other',
};

export function renderNewBelieverRemoved(p: NewBelieverRemovedPayload) {
  const actor = p.removedByName ? ` by ${escapeHtml(p.removedByName)}` : '';
  const reasonLabel = REMOVAL_REASON_LABELS[p.reason] ?? p.reason;
  const notesBlock = p.notes
    ? `<p><em>${escapeHtml(p.notes)}</em></p>`
    : '';
  return {
    subject: `New believer removed from pipeline: ${p.studentName}`,
    html: renderLayout({
      heading: 'New believer removed from pipeline',
      greeting: p.memberName,
      bodyHtml: `
        <p><strong>${escapeHtml(p.studentName)}</strong> was removed from the
           New Believers pipeline${actor}. Reason: <strong>${escapeHtml(reasonLabel)}</strong>.</p>
        ${notesBlock}
      `,
      cta: { label: 'Open profile', url: p.portalUrl },
    }),
  };
}

// ── Digest lines ──

export function digestJoinRequestReceived(p: JoinRequestReceivedPayload): string {
  return `${p.requesterName} requested to join ${p.targetName}`;
}

export function digestJoinRequestDecided(p: JoinRequestDecidedPayload): string {
  return `Your ${p.targetKind} request for ${p.targetName} was ${p.decision}`;
}

export function digestSoulAssigned(p: SoulAssignedPayload): string {
  return `${p.soulName} was assigned to you`;
}

export function digestSoulStatusChanged(p: SoulStatusChangedPayload): string {
  return `${p.soulName}: ${p.fromStatus} → ${p.toStatus}`;
}

export function digestNewBelieverStageMoved(p: NewBelieverStageMovedPayload): string {
  return `${p.studentName}: ${p.fromStage} → ${p.toStage}`;
}

export function digestNewBelieverRemoved(p: NewBelieverRemovedPayload): string {
  const reasonLabel = REMOVAL_REASON_LABELS[p.reason] ?? p.reason;
  return `${p.studentName} removed from pipeline (${reasonLabel})`;
}

// ── Membership interest ──

export interface MembershipInterestExpressedPayload {
  memberName: string;
  candidateName: string;
  branchName: string;
  poolUrl: string;
}

export function renderMembershipInterestExpressed(p: MembershipInterestExpressedPayload) {
  return {
    subject: `New membership interest: ${p.candidateName}`,
    html: renderLayout({
      heading: 'New membership interest',
      greeting: p.memberName,
      bodyHtml: `
        <p><strong>${escapeHtml(p.candidateName)}</strong> has joined the
           membership waiting list from <strong>${escapeHtml(p.branchName)}</strong>.</p>
        <p>They'll be considered for the next intake. If there's context
           the membership admin team should know before they're admitted,
           this is the moment to flag it.</p>
      `,
      cta: { label: 'View pool', url: p.poolUrl },
    }),
  };
}

export function digestMembershipInterestExpressed(p: MembershipInterestExpressedPayload): string {
  return `${p.candidateName} joined the membership waiting list (${p.branchName})`;
}

export interface MembershipCohortAdmittedPayload {
  memberName: string;
  candidateName: string;
  cohortName: string;
  branchName: string;
  portalUrl: string;
}

export function renderMembershipCohortAdmitted(p: MembershipCohortAdmittedPayload) {
  return {
    subject: `Admitted into ${p.cohortName}: ${p.candidateName}`,
    html: renderLayout({
      heading: 'A member of your branch has been admitted into a cohort',
      greeting: p.memberName,
      bodyHtml: `
        <p><strong>${escapeHtml(p.candidateName)}</strong> from
           <strong>${escapeHtml(p.branchName)}</strong> has been admitted into
           <strong>${escapeHtml(p.cohortName)}</strong>.</p>
        <p>Class attendance and graduation prep are the champion's beat from here.</p>
      `,
      cta: { label: 'Open cohort', url: p.portalUrl },
    }),
  };
}

export function digestMembershipCohortAdmitted(p: MembershipCohortAdmittedPayload): string {
  return `${p.candidateName} admitted into ${p.cohortName} (${p.branchName})`;
}

export interface MembershipCohortGraduatedPayload {
  memberName: string;
  candidateName: string;
  cohortName: string;
  branchName: string;
  portalUrl: string;
}

export function renderMembershipCohortGraduated(p: MembershipCohortGraduatedPayload) {
  return {
    subject: `Graduated ${p.cohortName}: ${p.candidateName}`,
    html: renderLayout({
      heading: 'A member of your branch has graduated a cohort',
      greeting: p.memberName,
      bodyHtml: `
        <p><strong>${escapeHtml(p.candidateName)}</strong> from
           <strong>${escapeHtml(p.branchName)}</strong> has graduated
           <strong>${escapeHtml(p.cohortName)}</strong> and is now a confirmed
           Member.</p>
        <p>Certificate presentation and induction ceremony fall to the branch
           champion. This is the moment to make sure both are prepared.</p>
      `,
      cta: { label: 'Open cohort', url: p.portalUrl },
    }),
  };
}

export function digestMembershipCohortGraduated(p: MembershipCohortGraduatedPayload): string {
  return `${p.candidateName} graduated ${p.cohortName} (${p.branchName})`;
}

export interface MembershipInterestEndedPayload {
  memberName: string;
  candidateName: string;
  branchName: string;
  reason: 'withdrawn' | 'lapsed';
  portalUrl: string;
}

const INTEREST_ENDED_REASON: Record<MembershipInterestEndedPayload['reason'], string> = {
  withdrawn: 'has taken themselves off the membership waiting list',
  lapsed: "'s membership waiting-list entry has lapsed",
};

export function renderMembershipInterestEnded(p: MembershipInterestEndedPayload) {
  const verb = INTEREST_ENDED_REASON[p.reason];
  const subjectVerb = p.reason === 'withdrawn' ? 'withdrew' : 'lapsed';
  return {
    subject: `Waiting-list ${subjectVerb}: ${p.candidateName}`,
    html: renderLayout({
      heading: 'A member of your branch is no longer on the waiting list',
      greeting: p.memberName,
      bodyHtml: `
        <p><strong>${escapeHtml(p.candidateName)}</strong> from
           <strong>${escapeHtml(p.branchName)}</strong> ${verb}.</p>
        <p>If pastoral follow-up is warranted, now is the moment.</p>
      `,
      cta: { label: 'View pool', url: p.portalUrl },
    }),
  };
}

export function digestMembershipInterestEnded(p: MembershipInterestEndedPayload): string {
  const label = p.reason === 'withdrawn' ? 'withdrew from' : 'lapsed off';
  return `${p.candidateName} ${label} the membership waiting list (${p.branchName})`;
}

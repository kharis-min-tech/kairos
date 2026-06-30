/**
 * Notification taxonomy — categories + per-category defaults + event types.
 *
 * Categories are the user-facing groupings on /settings/notifications.
 * Cadences control whether matching events fire immediately or are queued
 * for the daily digest cron.
 *
 * The `security` category is always treated as enabled regardless of any
 * stored preference — the API/UI prevents users from disabling it.
 */

export const NotificationCategory = {
  Security: 'security',
  Workflow: 'workflow',
  Lifecycle: 'lifecycle',
  Forms: 'forms',
  Rota: 'rota',
  Uniform: 'uniform',
  DeptRecruitment: 'dept_recruitment',
} as const;
export type NotificationCategory = (typeof NotificationCategory)[keyof typeof NotificationCategory];

export const NOTIFICATION_CATEGORIES: readonly NotificationCategory[] = [
  NotificationCategory.Security,
  NotificationCategory.Workflow,
  NotificationCategory.Lifecycle,
  NotificationCategory.Forms,
  NotificationCategory.Rota,
  NotificationCategory.Uniform,
  NotificationCategory.DeptRecruitment,
];

export const NotificationCadence = {
  Immediate: 'immediate',
  DigestDaily: 'digest_daily',
} as const;
export type NotificationCadence = (typeof NotificationCadence)[keyof typeof NotificationCadence];

/**
 * Default cadence per category. Applied when no row exists in
 * notification_preferences for (member, category). Security/rota/uniform/
 * dept_recruitment are immediate; the rest digest daily to limit inbox noise.
 */
export const NOTIFICATION_DEFAULT_CADENCE: Record<NotificationCategory, NotificationCadence> = {
  security: 'immediate',
  workflow: 'digest_daily',
  lifecycle: 'digest_daily',
  forms: 'digest_daily',
  rota: 'immediate',
  uniform: 'immediate',
  dept_recruitment: 'immediate',
};

/**
 * User-facing labels for the preferences page.
 */
export const NOTIFICATION_CATEGORY_LABEL: Record<NotificationCategory, string> = {
  security: 'Security',
  workflow: 'Workflow',
  lifecycle: 'Lifecycle',
  forms: 'Forms',
  rota: 'Rota',
  uniform: 'Uniform',
  dept_recruitment: 'Department recruitment',
};

export const NOTIFICATION_CATEGORY_DESCRIPTION: Record<NotificationCategory, string> = {
  security: 'Sign-in alerts, password changes, email changes, role grants. Always on.',
  workflow: 'Join requests, soul assignments, new-believer stage moves, recruitment progress.',
  lifecycle: 'Members confirmed, visitors promoted, children aged out, members archived.',
  forms: 'Form submissions awaiting your review, status changes on records you own.',
  rota: 'Rota confirmations, swap requests, day-before reminders.',
  uniform: 'Uniform set or updated for a department you lead.',
  dept_recruitment: 'Interview scheduled, offer extended, probation milestones.',
};

/**
 * Event-type strings used by the dispatcher. The category prefix is the
 * authoritative routing signal — the suffix identifies the specific event.
 *
 * Phase 1 wires the `security.*` triggers only. Other categories arrive in
 * later phases.
 */
export const NotificationEventType = {
  // ── Security ──
  SecurityPasswordResetRequested: 'security.password_reset_requested',
  SecurityPasswordChanged: 'security.password_changed',
  SecurityRoleGranted: 'security.role_granted',
  SecurityRoleRevoked: 'security.role_revoked',
  SecuritySigninNewDevice: 'security.signin_new_device',
  SecurityEmailChangeRequested: 'security.email_change_requested',
  SecurityEmailChangeConfirmed: 'security.email_change_confirmed',
  SecurityEmailChangedAlert: 'security.email_changed_alert',
  // ── Workflow ──
  WorkflowFellowshipJoinRequestReceived: 'workflow.fellowship_join_request_received',
  WorkflowFellowshipJoinRequestDecided: 'workflow.fellowship_join_request_decided',
  WorkflowDepartmentJoinRequestReceived: 'workflow.department_join_request_received',
  WorkflowDepartmentJoinRequestDecided: 'workflow.department_join_request_decided',
  WorkflowSoulAssigned: 'workflow.soul_assigned',
  WorkflowSoulStatusChanged: 'workflow.soul_status_changed',
  WorkflowNewBelieverStageMoved: 'workflow.new_believer_stage_moved',
  // ── Lifecycle ──
  LifecycleVisitorPromoted: 'lifecycle.visitor_promoted',
  LifecycleChildAgedOut: 'lifecycle.child_aged_out',
  LifecycleMemberConfirmed: 'lifecycle.member_confirmed',
  // ── Forms ──
  FormsSubmissionReceived: 'forms.submission_received',
  // ── Rota ──
  RotaAssignmentConfirmed: 'rota.assignment_confirmed',
  RotaSwapRequested: 'rota.swap_requested',
  // ── Uniform ──
  UniformScheduleSet: 'uniform.schedule_set',
} as const;
export type NotificationEventType = (typeof NotificationEventType)[keyof typeof NotificationEventType];

export interface NotificationPreferencePayload {
  category: NotificationCategory;
  enabled: boolean;
  cadence: NotificationCadence;
}

export interface ListNotificationPreferencesResponse {
  preferences: NotificationPreferencePayload[];
}

export interface UpdateNotificationPreferenceRequest {
  category: NotificationCategory;
  enabled: boolean;
  cadence: NotificationCadence;
}

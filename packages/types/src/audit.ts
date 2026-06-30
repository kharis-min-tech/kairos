/**
 * Audit log taxonomy — actions + outcomes captured in the audit_log table.
 *
 * Phase 2 wires sign-in success/failure, password change, role grant/revoke.
 * Phase 3 adds the email-change actions.
 */

export const AuditAction = {
  SigninSuccess: 'signin_success',
  SigninFailure: 'signin_failure',
  PasswordChange: 'password_change',
  EmailChangeRequested: 'email_change_requested',
  EmailChangeConfirmed: 'email_change_confirmed',
  EmailChangeReverted: 'email_change_reverted',
  RoleGranted: 'role_granted',
  RoleRevoked: 'role_revoked',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const AUDIT_ACTIONS: readonly AuditAction[] = [
  AuditAction.SigninSuccess,
  AuditAction.SigninFailure,
  AuditAction.PasswordChange,
  AuditAction.EmailChangeRequested,
  AuditAction.EmailChangeConfirmed,
  AuditAction.EmailChangeReverted,
  AuditAction.RoleGranted,
  AuditAction.RoleRevoked,
];

export const AuditOutcome = {
  Success: 'success',
  Failure: 'failure',
} as const;
export type AuditOutcome = (typeof AuditOutcome)[keyof typeof AuditOutcome];

/**
 * Human-readable labels for /profile/settings/security.
 */
export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  signin_success: 'Signed in',
  signin_failure: 'Sign-in attempt failed',
  password_change: 'Password changed',
  email_change_requested: 'Email change requested',
  email_change_confirmed: 'Email change confirmed',
  email_change_reverted: 'Email change reverted',
  role_granted: 'Role granted',
  role_revoked: 'Role removed',
};

export interface AuditLogRow {
  id: string;
  action: AuditAction;
  outcome: AuditOutcome;
  ip: string | null;
  userAgent: string | null;
  country: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ListMyAuditLogResponse {
  entries: AuditLogRow[];
}

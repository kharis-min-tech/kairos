/**
 * Audit log taxonomy — actions + outcomes captured in the audit_log table.
 *
 * Phase 2 wires sign-in success/failure, password change, role grant/revoke.
 * Phase 3 adds the email-change actions.
 * The oauth_* actions record Kairos acting as an OAuth authorization server
 * (Better-Auth Phase 2); client-scoped ones use targetType 'oauth_client'.
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
  OauthAuthorized: 'oauth_authorized',
  OauthDenied: 'oauth_denied',
  OauthGrantRevoked: 'oauth_grant_revoked',
  OauthTokenIssued: 'oauth_token_issued',
  OauthTokenReuse: 'oauth_token_reuse',
  OauthTokenFailure: 'oauth_token_failure',
  OauthClientCreated: 'oauth_client_created',
  OauthClientUpdated: 'oauth_client_updated',
  OauthClientSecretRotated: 'oauth_client_secret_rotated',
  OauthClientDeleted: 'oauth_client_deleted',
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
  AuditAction.OauthAuthorized,
  AuditAction.OauthDenied,
  AuditAction.OauthGrantRevoked,
  AuditAction.OauthTokenIssued,
  AuditAction.OauthTokenReuse,
  AuditAction.OauthTokenFailure,
  AuditAction.OauthClientCreated,
  AuditAction.OauthClientUpdated,
  AuditAction.OauthClientSecretRotated,
  AuditAction.OauthClientDeleted,
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
  oauth_authorized: 'Authorised an app',
  oauth_denied: 'Declined an app',
  oauth_grant_revoked: 'App access removed',
  oauth_token_issued: 'App signed in',
  oauth_token_reuse: 'App token reuse detected',
  oauth_token_failure: 'App token request failed',
  oauth_client_created: 'App registered',
  oauth_client_updated: 'App settings changed',
  oauth_client_secret_rotated: 'App secret rotated',
  oauth_client_deleted: 'App deleted',
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

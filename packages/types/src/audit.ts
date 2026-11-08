/**
 * Audit log taxonomy — actions + outcomes captured in the audit_log table.
 *
 * Phase 2 wires sign-in success/failure, password change, role grant/revoke.
 * Phase 3 adds the email-change actions.
 * The oauth_* actions record Kairos acting as an OAuth authorization server
 * (Better-Auth Phase 2); client-scoped ones use targetType 'oauth_client'.
 * The guardian_* and member_* actions record access to personal data rather
 * than account activity, and exist so a breach can be scoped.
 *
 * Adding a value here is NOT enough. `audit_log.action` carries a CHECK
 * constraint (`audit_log_action_check`, 0035, widened by 0058, 0063 and 0064),
 * and `recordAuditEvent` deliberately swallows insert errors so an audit
 * failure never breaks the action it observes. An action added here without a
 * migration widening that constraint therefore produces silence: the action
 * succeeds, and no audit row exists. Widen the constraint in the same change.
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
  // Guardian links grant and revoke sight of a child's unredacted record and
  // health record, so they are security events, not directory bookkeeping.
  GuardianLinked: 'guardian_linked',
  GuardianUnlinked: 'guardian_unlinked',
  // Reading and changing member data. Without these two, a data-exfiltration
  // or tampering incident cannot be scoped: there is no record of who pulled
  // the directory or whose record an actor edited, so the Article 33 72-hour
  // assessment has nothing to work from. See docs/security/incident-response.md
  // §2. Neither carries field VALUES — only which fields were touched, and how
  // many rows left — because an audit log full of personal data is a second
  // copy of it under a different retention period.
  MemberUpdated: 'member_updated',
  MemberExported: 'member_exported',
  // The forms export is a separate action rather than a reuse of
  // `member_exported`, because it carries a different population — form
  // submissions, including first-timer contact details and baby-dedication
  // records naming children — and an investigator filtering the log should not
  // have to read `targetType` to tell the two files apart.
  SubmissionsExported: 'submissions_exported',
  // The Gift Aid claim register. A third population again, and the one the
  // cyber-security checklist asks about by name ("who exported or accessed
  // donor/giving data"): it carries donor names and HOME ADDRESSES, which the
  // member directory export does not, and it is HMRC-facing evidence.
  DonorRegisterExported: 'donor_register_exported',
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
  AuditAction.GuardianLinked,
  AuditAction.GuardianUnlinked,
  AuditAction.MemberUpdated,
  AuditAction.MemberExported,
  AuditAction.SubmissionsExported,
  AuditAction.DonorRegisterExported,
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
  guardian_linked: 'Guardian linked',
  guardian_unlinked: 'Guardian removed',
  member_updated: 'Member record changed',
  member_exported: 'Member directory exported',
  submissions_exported: 'Form submissions exported',
  donor_register_exported: 'Gift Aid register exported',
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

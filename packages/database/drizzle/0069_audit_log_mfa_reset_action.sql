-- 0069_audit_log_mfa_reset_action.sql
--
-- One more action: `mfa_reset`, an administrator removing someone else's
-- second factor.
--
-- 0035 pinned audit_log.action to the eight actions that existed then; 0058,
-- 0063, 0064 and 0066 widened it. Fifth time, and the warning at the top of
-- packages/types/src/audit.ts says why it keeps happening: `recordAuditEvent`
-- swallows insert errors by design, so that an audit failure can never break
-- the action it observes. The cost of that choice is that a new action
-- without a matching widening produces SILENCE - the reset succeeds and
-- nothing records it.
--
-- This one matters more than most. The member cannot consent at the time:
-- the entire reason the endpoint exists is that they have lost their phone
-- and their backup codes and cannot sign in to object. So the audit row is
-- the only contemporaneous record of who removed the factor and from whom.
--
-- It is also, step for step, what an attacker who had taken over an admin
-- account would do before taking over a leader's: strip the second factor,
-- then use a password obtained elsewhere. The notification to the member is
-- the fast alarm; this row is the one that survives for the investigation.
--
-- The metadata records whether a confirmed factor actually existed
-- ('removed' vs 'nothing-to-remove') and never any part of the secret. A row
-- that carried the secret would hand a reader the factor it describes
-- destroying.

ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check
  CHECK (action IN (
    'signin_success','signin_failure','password_change',
    'email_change_requested','email_change_confirmed','email_change_reverted',
    'role_granted','role_revoked',
    'oauth_authorized','oauth_denied','oauth_grant_revoked',
    'oauth_token_issued','oauth_token_reuse','oauth_token_failure',
    'oauth_client_created','oauth_client_updated',
    'oauth_client_secret_rotated','oauth_client_deleted',
    'guardian_linked','guardian_unlinked',
    'member_updated','member_exported','submissions_exported',
    'donor_register_exported','member_erased',
    'mfa_reset'
  ));

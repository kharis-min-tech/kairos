-- 0058_audit_log_oauth_actions.sql
--
-- 0035 pinned audit_log.action to the eight actions that existed then. The
-- OAuth authorization server (0057) records oauth_* events, and every one of
-- them was rejected by this CHECK. recordAuditEvent swallows insert errors on
-- purpose (an audit failure must never break the action it observes), so the
-- result was silence: no row, no error, an empty Activity tab.
--
-- Widen the constraint rather than drop it: it is still the cheapest guard
-- against a typo'd action string reaching the table.

ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check
  CHECK (action IN (
    'signin_success','signin_failure','password_change',
    'email_change_requested','email_change_confirmed','email_change_reverted',
    'role_granted','role_revoked',
    'oauth_authorized','oauth_denied','oauth_grant_revoked',
    'oauth_token_issued','oauth_token_reuse','oauth_token_failure',
    'oauth_client_created','oauth_client_updated',
    'oauth_client_secret_rotated','oauth_client_deleted'
  ));

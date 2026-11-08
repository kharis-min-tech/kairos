-- 0063_audit_log_guardian_actions.sql
--
-- 0035 pinned audit_log.action to the eight actions that existed then, and 0058
-- widened it for the oauth_* set. The guardian endpoints
-- (POST/DELETE /api/members/:id/guardians) record two more:
--
--   guardian_linked    — an adult was attached as guardian of a member
--   guardian_unlinked  — a guardian link was deactivated
--
-- These are security events, not directory bookkeeping. A guardian link IS the
-- access-control decision for a child's record: hasHealthRecordAccess grants on
-- guardedMemberIds.has(member.id), so writing one hands that adult the child's
-- unredacted row plus read AND write on their health record, and removing one
-- revokes it. Granting or revoking sight of a child's data has to leave a trail.
--
-- Without this widening the CHECK rejects both inserts, and recordAuditEvent
-- swallows insert errors on purpose (an audit failure must never break the
-- action it observes) — so the result is silence: the guardian link is written,
-- the request returns 201, and no audit row exists. That is the worst failure
-- mode an audit log has, and it is exactly what 0058 was written to fix for the
-- oauth actions.
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
    'oauth_client_secret_rotated','oauth_client_deleted',
    'guardian_linked','guardian_unlinked'
  ));

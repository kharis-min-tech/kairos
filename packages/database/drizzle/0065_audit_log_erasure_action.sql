-- 0065_audit_log_erasure_action.sql
--
-- 0035 pinned audit_log.action; 0058, 0063 and 0064 widened it. One more:
--
--   member_erased — an Article 17 erasure completed, with the outcome of the
--                   remote-object deletion that accompanies it
--
-- Why this is a security event and not bookkeeping. Erasure in Kairos is
-- pseudonymisation of the member row PLUS destruction of objects that live
-- outside the database — today that means a profile photograph in Cloudflare
-- Images. Those two halves can come apart. The row scrub is a local
-- transaction and always succeeds; the image deletion is a network call to
-- another service and can fail.
--
-- An erasure whose image survived is an INCOMPLETE erasure. Before this, the
-- system could not tell the two apart: `photo_url` was set to NULL either way,
-- which made the surviving image not merely undeleted but unfindable — the
-- worst of both, since nothing recorded that an object was left behind and
-- nothing retained the handle needed to go and remove it later. That is DPIA
-- risk R5, and it is why the assessment calls R5's harm irreversible.
--
-- The metadata records the OUTCOME of the deletion ('deleted',
-- 'nothing-to-delete', 'failed') and never the data erased. An audit row that
-- preserved what was deleted would defeat the erasure it describes.
--
-- Without this widening the CHECK rejects the insert, and recordAuditEvent
-- swallows insert errors by design, so the result is silence: the erasure
-- happens and nothing records whether it was complete. Fourth time; the
-- warning now sits at the top of packages/types/src/audit.ts.

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
    'donor_register_exported','member_erased'
  ));

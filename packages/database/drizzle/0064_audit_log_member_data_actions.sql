-- 0064_audit_log_member_data_actions.sql
--
-- 0035 pinned audit_log.action to the eight actions that existed then; 0058
-- widened it for the oauth_* set and 0063 for the guardian_* pair. Two more
-- actions record access to member personal data itself:
--
--   member_updated        — an actor changed fields on a member record
--   member_exported       — an actor pulled the member directory out as CSV
--   submissions_exported  — an actor pulled form submissions out as CSV
--   donor_register_exported — an actor pulled the Gift Aid claim register
--
-- These exist because of a gap the pre-release security review found in the
-- incident-response procedure, not because of a new feature. UK GDPR Article 33
-- gives 72 hours from awareness to assess a personal-data breach and decide
-- whether to notify the ICO. That assessment needs to answer two questions:
-- whose data left, and who touched it. Before these actions the system could
-- answer neither — GET /api/members/export produced a file containing every
-- member a caller could reach, including children's records, and left no trace
-- at all, so a leaked export could not even be attributed, let alone scoped.
-- The forms export had the identical gap, over a population that includes
-- first-timer contact details and baby-dedication records naming children; it
-- gets its own action rather than reusing member_exported, so an investigator
-- filtering the log does not have to read targetType to tell the two apart.
--
-- The Gift Aid register is the third such path and the one the cyber-security
-- checklist names explicitly ("who exported or accessed donor/giving data").
-- It is separate again because it carries donor names and HOME ADDRESSES,
-- which the directory export does not, and because it is HMRC-facing evidence
-- with a six-year retention of its own. Two routes serve it —
-- GET /api/gift-aid/register and /register.csv — and both go through
-- exportRegister, so the audit row is written in the service, not the router.
--
-- Deliberately NOT recorded: field values, and the contents of the export.
-- Only which field names an update touched, and how many rows the export
-- carried. An audit log holding the values would be a second copy of the same
-- personal data under a different retention period and a different access
-- gate — it would enlarge the breach it exists to describe.
--
-- Without this widening the CHECK rejects both inserts, and recordAuditEvent
-- swallows insert errors on purpose (an audit failure must never break the
-- action it observes) — so the result is silence: the export succeeds, the file
-- is served, and no audit row exists. 0058 and 0063 were each written to fix
-- exactly this, which is the third time; `packages/types/src/audit.ts` now
-- carries the warning at the top of the file.
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
    'guardian_linked','guardian_unlinked',
    'member_updated','member_exported','submissions_exported',
    'donor_register_exported'
  ));

-- Phase 2: security audit log.
--
-- Captures sign-in attempts (success + failure), password changes, role
-- grants/revokes, and (Phase 3) email change events. actor_member_id is
-- nullable so a sign-in failure for an unknown email is still recorded.

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  outcome VARCHAR(20) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  ip VARCHAR(45),
  user_agent VARCHAR(500),
  country VARCHAR(2),
  attempted_email VARCHAR(200),
  metadata JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check
  CHECK (action IN (
    'signin_success','signin_failure','password_change',
    'email_change_requested','email_change_confirmed','email_change_reverted',
    'role_granted','role_revoked'
  ));

ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_outcome_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_outcome_check
  CHECK (outcome IN ('success','failure'));

CREATE INDEX IF NOT EXISTS idx_audit_log_actor_created
  ON audit_log(actor_member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

CREATE TRIGGER set_audit_log_updated_at
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

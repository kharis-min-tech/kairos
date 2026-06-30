-- Phase 3: email change flow + consent records.
--
-- email_change_requests holds pending and completed email-change flows; one
-- pending row per member at a time. consent_records is an immutable log of
-- user consent acceptance keyed on (member, consent_type, version).

CREATE TABLE IF NOT EXISTS email_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  old_email VARCHAR(200) NOT NULL,
  new_email VARCHAR(200) NOT NULL,
  confirm_token_hash VARCHAR(200) NOT NULL,
  undo_token_hash VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  confirmed_at TIMESTAMP,
  reverted_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE email_change_requests DROP CONSTRAINT IF EXISTS email_change_requests_status_check;
ALTER TABLE email_change_requests ADD CONSTRAINT email_change_requests_status_check
  CHECK (status IN ('pending','confirmed','reverted','expired'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_change_requests_pending_member
  ON email_change_requests(member_id)
  WHERE status = 'pending' AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_email_change_requests_status ON email_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_email_change_requests_expires ON email_change_requests(expires_at);

CREATE TRIGGER set_email_change_requests_updated_at
  BEFORE UPDATE ON email_change_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  consent_type VARCHAR(30) NOT NULL,
  version VARCHAR(20) NOT NULL,
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE consent_records DROP CONSTRAINT IF EXISTS consent_records_type_check;
ALTER TABLE consent_records ADD CONSTRAINT consent_records_type_check
  CHECK (consent_type IN ('terms','privacy','marketing'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_consent_records_member_type_version
  ON consent_records(member_id, consent_type, version)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_consent_records_member_type
  ON consent_records(member_id, consent_type);

CREATE TRIGGER set_consent_records_updated_at
  BEFORE UPDATE ON consent_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

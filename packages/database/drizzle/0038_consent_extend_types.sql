-- Extend the consent_records.consent_type CHECK to accept two new types:
--   acceptable_use          — Acceptable Use Policy (required for everyone)
--   admin_confidentiality   — Confidentiality & Data Handling Undertaking
--                             (required only for users with a leadership or
--                             administrative role — enforced at the API/UI
--                             layer, not by the DB)

ALTER TABLE consent_records DROP CONSTRAINT IF EXISTS consent_records_type_check;
ALTER TABLE consent_records ADD CONSTRAINT consent_records_type_check
  CHECK (consent_type IN ('terms','privacy','marketing','acceptable_use','admin_confidentiality'));

-- GDPR / safeguarding consent on form submissions.
-- Nullable for backward compatibility with rows captured before the consent flow shipped.
ALTER TABLE form_submissions
  ADD COLUMN IF NOT EXISTS consent_given_at timestamp,
  ADD COLUMN IF NOT EXISTS consent_by uuid REFERENCES members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS consent_policy_version varchar(20);

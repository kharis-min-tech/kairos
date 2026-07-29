-- Signup email verification: hashed token + expiry columns on members.
-- Mirrors the password_reset_token / password_reset_expiry pattern.

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS email_verification_expiry TIMESTAMP;

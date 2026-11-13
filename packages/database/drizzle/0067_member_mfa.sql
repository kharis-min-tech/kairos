-- Second factor for privileged accounts (TOTP, RFC 6238).
--
-- Deliberately its OWN tables rather than columns on `members`. Both
-- `login()` and `refreshAccessToken()` do a `select().from(members)` with no
-- column list, so a secret stored there would be pulled into memory on every
-- token refresh, returned by every helper that passes a member row around,
-- and printed by any debug log that dumps one. A TOTP secret is symmetric —
-- whoever reads it can mint valid codes forever, and unlike a password it
-- cannot be one-way hashed — so the row it lives in should be one that
-- nothing reads by accident.

CREATE TABLE IF NOT EXISTS member_mfa (
  member_id UUID PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,

  -- AES-256-GCM. The IV is per-row and public; the key is MFA_ENCRYPTION_KEY
  -- and is never in this database. A database backup on its own therefore
  -- does not yield working second factors.
  secret_ciphertext TEXT NOT NULL,
  secret_iv VARCHAR(32) NOT NULL,

  -- NULL means enrolment was started and never finished. Those rows are not
  -- a second factor and must never be treated as one: the member has scanned
  -- a QR code but has not proved the authenticator works, so enforcing
  -- against this row would lock them out of their own account.
  confirmed_at TIMESTAMP,

  -- The highest TOTP step already accepted. Replay protection: a code is
  -- valid across a 90-second window, so without this a code seen over a
  -- shoulder or in a screenshot stays usable.
  last_used_step BIGINT,

  -- Throttling. TOTP is six digits, so an unthrottled verify endpoint is a
  -- 1-in-a-million guess per attempt and a few hundred thousand attempts is
  -- not a large number of requests.
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Backup codes, for the phone that is lost, wiped or replaced. Without these
-- the recovery path is "an admin disables your MFA", which is a social
-- engineering target and, for the one system admin, a way to lock the church
-- out of its own system permanently.
CREATE TABLE IF NOT EXISTS member_mfa_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  -- SHA-256, not argon2id, and that is on purpose rather than an oversight.
  -- argon2id exists to make LOW-entropy secrets expensive to guess. A backup
  -- code here is 50 bits of randomness, so there is no dictionary to stretch
  -- against, and the Worker's CPU budget is real: argon2id at the OWASP
  -- parameters this codebase uses for passwords costs tens of milliseconds,
  -- which is the wrong thing to spend on a lookup. Hashing also lets the
  -- lookup be an indexed equality match instead of a scan-and-compare.
  code_hash VARCHAR(64) NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_mfa_backup_codes_member
  ON member_mfa_backup_codes(member_id);

-- The lookup verify() actually makes. Unique so the same code cannot be
-- issued twice to one member, which would let one redemption consume two rows
-- or neither depending on the delete's row order.
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_mfa_backup_codes_lookup
  ON member_mfa_backup_codes(member_id, code_hash);

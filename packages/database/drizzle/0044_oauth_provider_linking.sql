-- Phase 1 Better-Auth: OAuth provider linking (Google / Microsoft / Apple).
--
-- Three new tables, all strictly additive. Existing bcrypt auth in
-- members.password_hash keeps working untouched.
--
--   oauth_accounts             — one row per (member × provider) link.
--                                Unique index is partial on is_active so a
--                                disconnected link can be re-established.
--   oauth_sessions             — Better-Auth default session store. Present
--                                for Phase 2 (server-backed sessions); unused
--                                in Phase 1 (still JWT via existing service).
--   oauth_verification_tokens  — short-lived tokens for link-confirmation and
--                                optional OAuth state persistence.
--
-- NOTE: audit_log needs no schema change. The `method` field
-- (password | oauth_google | oauth_microsoft | oauth_apple) piggybacks on
-- the existing metadata JSONB column.

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  provider_email VARCHAR(255),
  provider_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  access_token TEXT,
  refresh_token TEXT,
  access_token_expires_at TIMESTAMP,
  scope VARCHAR(500),
  connected_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE oauth_accounts DROP CONSTRAINT IF EXISTS oauth_accounts_provider_check;
ALTER TABLE oauth_accounts ADD CONSTRAINT oauth_accounts_provider_check
  CHECK (provider IN ('google','microsoft','apple'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_oauth_accounts_provider_sub_active
  ON oauth_accounts(provider, provider_user_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_oauth_accounts_member
  ON oauth_accounts(member_id);

CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider_email
  ON oauth_accounts(provider_email);

DROP TRIGGER IF EXISTS set_oauth_accounts_updated_at ON oauth_accounts;
CREATE TRIGGER set_oauth_accounts_updated_at
  BEFORE UPDATE ON oauth_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


CREATE TABLE IF NOT EXISTS oauth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  ip VARCHAR(45),
  user_agent VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_sessions_member
  ON oauth_sessions(member_id);

CREATE INDEX IF NOT EXISTS idx_oauth_sessions_token
  ON oauth_sessions(session_token);

CREATE INDEX IF NOT EXISTS idx_oauth_sessions_expires
  ON oauth_sessions(expires_at);

DROP TRIGGER IF EXISTS set_oauth_sessions_updated_at ON oauth_sessions;
CREATE TRIGGER set_oauth_sessions_updated_at
  BEFORE UPDATE ON oauth_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


CREATE TABLE IF NOT EXISTS oauth_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  kind VARCHAR(30) NOT NULL,
  metadata JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_oauth_verification_tokens_token
  ON oauth_verification_tokens(token);

CREATE INDEX IF NOT EXISTS idx_oauth_verification_tokens_identifier_kind
  ON oauth_verification_tokens(identifier, kind);

CREATE INDEX IF NOT EXISTS idx_oauth_verification_tokens_expires
  ON oauth_verification_tokens(expires_at);

DROP TRIGGER IF EXISTS set_oauth_verification_tokens_updated_at ON oauth_verification_tokens;
CREATE TRIGGER set_oauth_verification_tokens_updated_at
  BEFORE UPDATE ON oauth_verification_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

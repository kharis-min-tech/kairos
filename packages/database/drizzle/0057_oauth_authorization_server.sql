-- 0057_oauth_authorization_server.sql
--
-- Better-Auth Phase 2: Kairos becomes an OAuth2 / OpenID Connect authorization
-- server, so other Kharis apps (analytics first) can offer "Sign in with
-- Kairos". Purely additive — no existing table is touched.
--
-- Secrets, codes and refresh tokens are stored as SHA-256 digests only; the
-- plaintext is shown once, at creation.

CREATE TABLE IF NOT EXISTS oauth_clients (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                   varchar(64) NOT NULL UNIQUE,
  name                        varchar(120) NOT NULL,
  description                 text,
  logo_url                    varchar(500),
  homepage_url                varchar(500),
  privacy_url                 varchar(500),
  terms_url                   varchar(500),
  client_type                 varchar(20) NOT NULL,
  secret_hash                 varchar(64),
  previous_secret_hash        varchar(64),
  previous_secret_expires_at  timestamp,
  redirect_uris               text[] NOT NULL,
  allowed_scopes              text[] NOT NULL,
  is_trusted                  boolean NOT NULL DEFAULT false,
  created_by_member_id        uuid REFERENCES members(id) ON DELETE SET NULL,
  last_used_at                timestamp,
  is_active                   boolean NOT NULL DEFAULT true,
  created_at                  timestamp NOT NULL DEFAULT NOW(),
  updated_at                  timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT oauth_clients_type_check CHECK (client_type IN ('confidential', 'public')),
  -- A confidential client without a secret could authenticate as anyone.
  CONSTRAINT oauth_clients_secret_check CHECK (client_type = 'public' OR secret_hash IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS oauth_grants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  client_id     uuid NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
  scopes        text[] NOT NULL,
  last_used_at  timestamp,
  revoked_at    timestamp,
  created_at    timestamp NOT NULL DEFAULT NOW(),
  updated_at    timestamp NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_oauth_grants_member_client_live
  ON oauth_grants(member_id, client_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_oauth_grants_member ON oauth_grants(member_id);
CREATE INDEX IF NOT EXISTS idx_oauth_grants_client ON oauth_grants(client_id);

CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash       varchar(64) NOT NULL UNIQUE,
  grant_id        uuid NOT NULL REFERENCES oauth_grants(id) ON DELETE CASCADE,
  redirect_uri    varchar(1000) NOT NULL,
  scopes          text[] NOT NULL,
  code_challenge  varchar(128) NOT NULL,
  nonce           varchar(255),
  expires_at      timestamp NOT NULL,
  consumed_at     timestamp,
  created_at      timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_codes_grant ON oauth_authorization_codes(grant_id);
CREATE INDEX IF NOT EXISTS idx_oauth_codes_expires ON oauth_authorization_codes(expires_at);

CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash         varchar(64) NOT NULL UNIQUE,
  family_id          uuid NOT NULL,
  grant_id           uuid NOT NULL REFERENCES oauth_grants(id) ON DELETE CASCADE,
  scopes             text[] NOT NULL,
  expires_at         timestamp NOT NULL,
  family_expires_at  timestamp NOT NULL,
  rotated_at         timestamp,
  revoked_at         timestamp,
  created_at         timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_refresh_family ON oauth_refresh_tokens(family_id);
CREATE INDEX IF NOT EXISTS idx_oauth_refresh_grant ON oauth_refresh_tokens(grant_id);

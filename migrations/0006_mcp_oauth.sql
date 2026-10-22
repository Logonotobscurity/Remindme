-- OAuth 2.1 authorization code + PKCE for remote MCP clients.
-- Token values are always hashed before persistence. Resource and scope values
-- are bound to every issued token, and refresh tokens are one-time rotating.
CREATE TABLE IF NOT EXISTS oauth_clients (
  client_id TEXT PRIMARY KEY,
  client_secret_hash TEXT,
  client_name TEXT NOT NULL,
  redirect_uris JSONB NOT NULL,
  grant_types JSONB NOT NULL DEFAULT '["authorization_code","refresh_token"]'::jsonb,
  response_types JSONB NOT NULL DEFAULT '["code"]'::jsonb,
  token_endpoint_auth_method TEXT NOT NULL CHECK (
    token_endpoint_auth_method IN ('none', 'client_secret_basic', 'client_secret_post')
  ),
  application_type TEXT NOT NULL DEFAULT 'web' CHECK (application_type IN ('web', 'native')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disabled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS oauth_consent_requests (
  request_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  client_id TEXT NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  state TEXT NOT NULL,
  resource TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  scopes JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('claude', 'chatgpt', 'grok', 'log_on', 'manual')),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
  code_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  client_id TEXT NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  resource TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  scopes JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oauth_access_tokens (
  id BIGSERIAL PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  client_id TEXT NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  scopes JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('claude', 'chatgpt', 'grok', 'log_on', 'manual')),
  family_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
  id BIGSERIAL PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  client_id TEXT NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  scopes JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('claude', 'chatgpt', 'grok', 'log_on', 'manual')),
  family_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_clients_active ON oauth_clients(created_at DESC)
  WHERE disabled_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_oauth_consent_request_expiry ON oauth_consent_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_authorization_code_expiry ON oauth_authorization_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_access_user_active ON oauth_access_tokens(user_id, expires_at DESC)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_oauth_access_client_family ON oauth_access_tokens(client_id, family_id);
CREATE INDEX IF NOT EXISTS idx_oauth_refresh_family ON oauth_refresh_tokens(client_id, family_id);
CREATE INDEX IF NOT EXISTS idx_oauth_refresh_active ON oauth_refresh_tokens(client_id, expires_at DESC)
  WHERE revoked_at IS NULL AND used_at IS NULL;

CREATE TABLE IF NOT EXISTS oauth_user_grants (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  client_id TEXT NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('claude', 'chatgpt', 'grok', 'log_on', 'manual')),
  scopes JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  UNIQUE (user_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_user_grants_user
  ON oauth_user_grants(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oauth_user_grants_client
  ON oauth_user_grants(client_id, user_id);

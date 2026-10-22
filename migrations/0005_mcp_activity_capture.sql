-- Remote MCP access for explicit, user-owned AI activity capture.
-- Raw tokens are never stored; only SHA-256 hashes are retained.
CREATE TABLE IF NOT EXISTS mcp_access_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  label TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('claude', 'chatgpt', 'grok', 'log_on', 'manual')),
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mcp_access_tokens_user_active
  ON mcp_access_tokens(user_id, created_at DESC)
  WHERE revoked_at IS NULL;

-- Keep MCP-created decisions and action items idempotent when callers supply a
-- stable source reference. Null references remain allowed for ordinary records.
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS source_reference TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_decisions_user_source_reference
  ON decisions(user_id, source, source_reference)
  WHERE source_reference IS NOT NULL;

ALTER TABLE action_items ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS source_reference TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_action_items_user_source_reference
  ON action_items(user_id, source, source_reference)
  WHERE source_reference IS NOT NULL;

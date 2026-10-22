import { createHash, randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";

export const MCP_SOURCES = ["claude", "chatgpt", "grok", "log_on", "manual"] as const;
export type McpSource = (typeof MCP_SOURCES)[number];

export type McpTokenSummary = {
  id: number;
  label: string;
  source: McpSource;
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
};

function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * Create a source-scoped personal MCP token. The plaintext is returned once;
 * only its SHA-256 digest is written to the database.
 */
export async function createMcpAccessToken(
  userId: string,
  label: string,
  source: McpSource,
) {
  const normalizedLabel = label.trim();
  if (!normalizedLabel || normalizedLabel.length > 80) {
    throw new Error("Token label must be between 1 and 80 characters.");
  }

  const token = "rmm_" + randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const tokenPrefix = token.slice(0, 12);
  const sql = await getSql();
  const rows = await sql.query<{ id: number; created_at: string }>(
    [
      "INSERT INTO mcp_access_tokens (user_id, label, source, token_hash, token_prefix)",
      "VALUES ($1, $2, $3, $4, $5)",
      "RETURNING id, created_at",
    ].join("\n"),
    [userId, normalizedLabel, source, tokenHash, tokenPrefix],
  );
  const row = rows[0];
  if (!row) throw new Error("Could not create the MCP token.");

  return {
    id: row.id,
    label: normalizedLabel,
    source,
    tokenPrefix,
    token,
    createdAt: row.created_at,
  };
}

export async function listMcpAccessTokens(userId: string): Promise<McpTokenSummary[]> {
  const sql = await getSql();
  return sql.query<McpTokenSummary>(
    [
      "SELECT id, label, source, token_prefix, created_at, last_used_at",
      "FROM mcp_access_tokens",
      "WHERE user_id = $1 AND revoked_at IS NULL",
      "ORDER BY created_at DESC",
      "LIMIT 50",
    ].join("\n"),
    [userId],
  );
}

export async function revokeMcpAccessToken(userId: string, id: number) {
  const sql = await getSql();
  const rows = await sql.query<{ id: number }>(
    [
      "UPDATE mcp_access_tokens",
      "SET revoked_at = NOW()",
      "WHERE user_id = $1 AND id = $2 AND revoked_at IS NULL",
      "RETURNING id",
    ].join("\n"),
    [userId, id],
  );
  return rows.length > 0;
}

export type McpTokenPrincipal = {
  tokenId: number;
  userId: string;
  source: McpSource;
  scopes: string[];
  authMethod: "personal_token" | "oauth";
};

function parseScopes(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Validate either a user-managed personal token or a resource-bound OAuth token. */
export async function authenticateMcpToken(request: Request): Promise<McpTokenPrincipal | null> {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!bearer || !/^rmm_[A-Za-z0-9_-]{40,80}$/.test(bearer)) return null;

  const sql = await getSql();
  if (bearer.startsWith("rmm_oat_")) {
    const url = new URL(request.url);
    const resource = url.origin + url.pathname;
    const rows = await sql.query<{
      id: number;
      user_id: string;
      source: McpSource;
      scopes: unknown;
    }>(
      [
        "SELECT id, user_id, source, scopes",
        "FROM oauth_access_tokens",
        "WHERE token_hash = $1 AND resource = $2",
        "  AND revoked_at IS NULL AND expires_at > NOW()",
        "LIMIT 1",
      ].join("\n"),
      [hashToken(bearer), resource],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      tokenId: row.id,
      userId: row.user_id,
      source: row.source,
      scopes: parseScopes(row.scopes),
      authMethod: "oauth",
    };
  }

  const rows = await sql.query<{ id: number; user_id: string; source: McpSource }>(
    [
      "SELECT id, user_id, source",
      "FROM mcp_access_tokens",
      "WHERE token_hash = $1 AND revoked_at IS NULL",
      "LIMIT 1",
    ].join("\n"),
    [hashToken(bearer)],
  );
  const row = rows[0];
  if (!row) return null;

  // Avoid a write on every tool request while retaining useful last-used metadata.
  await sql.query(
    [
      "UPDATE mcp_access_tokens",
      "SET last_used_at = NOW()",
      "WHERE id = $1 AND (last_used_at IS NULL OR last_used_at < NOW() - INTERVAL '1 minute')",
    ].join("\n"),
    [row.id],
  );

  return {
    tokenId: row.id,
    userId: row.user_id,
    source: row.source,
    scopes: ["activity:read", "activity:write"],
    authMethod: "personal_token",
  };
}

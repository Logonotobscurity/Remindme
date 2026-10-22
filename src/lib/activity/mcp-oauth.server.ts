import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";
import {
  isValidOAuthRedirectUri,
  normalizeOAuthScopes,
  pkceMatches,
  sha256Hex,
  type McpOAuthScope,
} from "./mcp-oauth-policy.mjs";

export const MCP_OAUTH_SCOPES = ["activity:read", "activity:write", "offline_access"] as const;
export type OAuthClientAuthMethod = "none" | "client_secret_basic" | "client_secret_post";
export type OAuthApplicationType = "web" | "native";

export type OAuthClient = {
  client_id: string;
  client_secret_hash: string | null;
  client_name: string;
  redirect_uris: string[] | string;
  grant_types: string[] | string;
  response_types: string[] | string;
  token_endpoint_auth_method: OAuthClientAuthMethod;
  application_type: OAuthApplicationType;
  disabled_at: string | null;
};

function jsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((part): part is string => typeof part === "string");
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((part): part is string => typeof part === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function newOpaqueToken(prefix: string) {
  return prefix + randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token: string) {
  return sha256Hex(token);
}

export function constantTimeSecretMatch(candidate: string, storedHash: string | null) {
  if (!storedHash) return false;
  const candidateHash = Buffer.from(sha256Hex(candidate), "hex");
  let expected: Buffer;
  try {
    expected = Buffer.from(storedHash, "hex");
  } catch {
    return false;
  }
  return expected.length === candidateHash.length && timingSafeEqual(expected, candidateHash);
}

export function canonicalMcpResource(requestUrl: string | URL) {
  const url = new URL(requestUrl);
  return url.origin + "/api/v1/mcp";
}

export function validResourceValue(candidate: string | null | undefined, canonical: string) {
  if (!candidate) return false;
  try {
    const value = new URL(candidate);
    return value.href === canonical && !value.hash && !value.search;
  } catch {
    return false;
  }
}

export function htmlEscape(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}

export function jsonScope(value: unknown): McpOAuthScope[] {
  return normalizeOAuthScopes(jsonArray(value).join(" "));
}

export async function findOAuthClient(clientId: string): Promise<OAuthClient | null> {
  const sql = await getSql();
  const rows = await sql.query<OAuthClient>(
    [
      "SELECT client_id, client_secret_hash, client_name, redirect_uris, grant_types,",
      "  response_types, token_endpoint_auth_method, application_type, disabled_at",
      "FROM oauth_clients WHERE client_id = $1 LIMIT 1",
    ].join("\n"),
    [clientId],
  );
  const row = rows[0];
  if (!row || row.disabled_at) return null;
  return {
    ...row,
    redirect_uris: jsonArray(row.redirect_uris),
    grant_types: jsonArray(row.grant_types),
    response_types: jsonArray(row.response_types),
  };
}

export async function registerOAuthClient(input: {
  clientName: string;
  redirectUris: string[];
  authMethod: OAuthClientAuthMethod;
  applicationType: OAuthApplicationType;
}) {
  if (!input.clientName.trim() || input.clientName.trim().length > 120) {
    throw new Error("invalid_client_metadata");
  }
  if (input.redirectUris.length < 1 || input.redirectUris.length > 10) {
    throw new Error("invalid_redirect_uri");
  }
  const uniqueUris = [...new Set(input.redirectUris)];
  if (uniqueUris.length !== input.redirectUris.length ||
      uniqueUris.some((uri) => !isValidOAuthRedirectUri(uri, input.applicationType))) {
    throw new Error("invalid_redirect_uri");
  }

  const sql = await getSql();
  const clientId = "rmm_client_" + randomBytes(24).toString("base64url");
  const clientSecret = input.authMethod === "none" ? null : newOpaqueToken("rmm_cs_");
  const clientSecretHash = clientSecret ? sha256Hex(clientSecret) : null;
  const rows = await sql.query<{ created_at: string }>(
    [
      "INSERT INTO oauth_clients (client_id, client_secret_hash, client_name, redirect_uris,",
      "  grant_types, response_types, token_endpoint_auth_method, application_type)",
      "VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8)",
      "RETURNING created_at",
    ].join("\n"),
    [
      clientId,
      clientSecretHash,
      input.clientName.trim(),
      JSON.stringify(uniqueUris),
      JSON.stringify(["authorization_code", "refresh_token"]),
      JSON.stringify(["code"]),
      input.authMethod,
      input.applicationType,
    ],
  );
  return {
    client_id: clientId,
    client_name: input.clientName.trim(),
    redirect_uris: uniqueUris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: input.authMethod,
    application_type: input.applicationType,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    ...(clientSecret ? { client_secret: clientSecret, client_secret_expires_at: 0 } : {}),
    created_at: rows[0]?.created_at ?? new Date().toISOString(),
  };
}

export type OAuthCodeInput = {
  userId: string;
  clientId: string;
  redirectUri: string;
  state: string;
  resource: string;
  codeChallenge: string;
  scopes: McpOAuthScope[];
};

export async function createOAuthConsentRequest(input: OAuthCodeInput) {
  const sql = await getSql();
  const requestToken = newOpaqueToken("rmm_consent_");
  await sql.query(
    [
      "INSERT INTO oauth_consent_requests (request_hash, user_id, client_id, redirect_uri,",
      "  state, resource, code_challenge, scopes, expires_at)",
      "VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW() + INTERVAL '10 minutes')",
    ].join("\n"),
    [
      sha256Hex(requestToken),
      input.userId,
      input.clientId,
      input.redirectUri,
      input.state,
      input.resource,
      input.codeChallenge,
      JSON.stringify(input.scopes),
    ],
  );
  return requestToken;
}

export type OAuthConsentRequest = {
  user_id: string;
  client_id: string;
  redirect_uri: string;
  state: string;
  resource: string;
  code_challenge: string;
  scopes: McpOAuthScope[] | string;
  expires_at: string;
  consumed_at: string | null;
};

export async function getOAuthConsentRequest(requestToken: string, userId: string) {
  const sql = await getSql();
  const rows = await sql.query<OAuthConsentRequest>(
    [
      "SELECT user_id, client_id, redirect_uri, state, resource, code_challenge, scopes, expires_at, consumed_at",
      "FROM oauth_consent_requests",
      "WHERE request_hash = $1 AND user_id = $2 AND expires_at > NOW() AND consumed_at IS NULL",
      "LIMIT 1",
    ].join("\n"),
    [sha256Hex(requestToken), userId],
  );
  const row = rows[0];
  return row ? { ...row, scopes: jsonScope(row.scopes) } : null;
}

export async function consumeOAuthConsentRequest(requestToken: string, userId: string) {
  const sql = await getSql();
  const rows = await sql.query<{ request_hash: string }>(
    [
      "UPDATE oauth_consent_requests",
      "SET consumed_at = NOW()",
      "WHERE request_hash = $1 AND user_id = $2 AND expires_at > NOW() AND consumed_at IS NULL",
      "RETURNING request_hash",
    ].join("\n"),
    [sha256Hex(requestToken), userId],
  );
  return rows.length > 0;
}

export async function createOAuthAuthorizationCode(input: {
  userId: string;
  clientId: string;
  redirectUri: string;
  resource: string;
  codeChallenge: string;
  scopes: McpOAuthScope[];
}) {
  const sql = await getSql();
  const code = newOpaqueToken("rmm_ac_");
  await sql.query(
    [
      "INSERT INTO oauth_authorization_codes (code_hash, user_id, client_id, redirect_uri,",
      "  resource, code_challenge, scopes, expires_at)",
      "VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW() + INTERVAL '5 minutes')",
    ].join("\n"),
    [
      sha256Hex(code),
      input.userId,
      input.clientId,
      input.redirectUri,
      input.resource,
      input.codeChallenge,
      JSON.stringify(input.scopes),
    ],
  );
  return code;
}

export type OAuthAuthorizationCode = {
  user_id: string;
  client_id: string;
  redirect_uri: string;
  resource: string;
  code_challenge: string;
  scopes: McpOAuthScope[] | string;
  expires_at: string;
  consumed_at: string | null;
};

export async function consumeOAuthAuthorizationCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  resource: string;
  codeVerifier: string;
}) {
  const sql = await getSql();
  const rows = await sql.query<OAuthAuthorizationCode>(
    [
      "SELECT user_id, client_id, redirect_uri, resource, code_challenge, scopes, expires_at, consumed_at",
      "FROM oauth_authorization_codes",
      "WHERE code_hash = $1 AND client_id = $2 AND redirect_uri = $3 AND resource = $4",
      "  AND expires_at > NOW() AND consumed_at IS NULL",
      "LIMIT 1",
    ].join("\n"),
    [sha256Hex(input.code), input.clientId, input.redirectUri, input.resource],
  );
  const row = rows[0];
  if (!row || !pkceMatches(input.codeVerifier, row.code_challenge)) return null;

  const consumed = await sql.query<{ code_hash: string }>(
    [
      "UPDATE oauth_authorization_codes SET consumed_at = NOW()",
      "WHERE code_hash = $1 AND consumed_at IS NULL AND expires_at > NOW()",
      "RETURNING code_hash",
    ].join("\n"),
    [sha256Hex(input.code)],
  );
  if (consumed.length === 0) return null;
  return { ...row, scopes: jsonScope(row.scopes) };
}

export async function issueOAuthTokens(input: {
  userId: string;
  clientId: string;
  resource: string;
  scopes: McpOAuthScope[];
  familyId?: string;
}) {
  const sql = await getSql();
  const familyId = input.familyId ?? randomUUID();
  const accessToken = newOpaqueToken("rmm_oat_");
  const expiresIn = 3600;
  await sql.query(
    [
      "INSERT INTO oauth_access_tokens (token_hash, user_id, client_id, resource, scopes, family_id, expires_at)",
      "VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW() + ($7 * INTERVAL '1 second'))",
    ].join("\n"),
    [
      sha256Hex(accessToken),
      input.userId,
      input.clientId,
      input.resource,
      JSON.stringify(input.scopes.filter((scope) => scope !== "offline_access")),
      familyId,
      expiresIn,
    ],
  );

  const hasOffline = input.scopes.includes("offline_access");
  let refreshToken: string | undefined;
  if (hasOffline) {
    refreshToken = newOpaqueToken("rmm_ort_");
    await sql.query(
      [
        "INSERT INTO oauth_refresh_tokens (token_hash, user_id, client_id, resource, scopes, family_id, expires_at)",
        "VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW() + INTERVAL '30 days')",
      ].join("\n"),
      [
        sha256Hex(refreshToken),
        input.userId,
        input.clientId,
        input.resource,
        JSON.stringify(input.scopes),
        familyId,
      ],
    );
  }

  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn,
    scope: input.scopes.join(" "),
    ...(refreshToken ? { refresh_token: refreshToken } : {}),
  };
}

export async function rotateOAuthRefreshToken(input: {
  refreshToken: string;
  clientId: string;
  resource: string;
  requestedScopes: string[] | null;
}) {
  const sql = await getSql();
  const tokenHash = sha256Hex(input.refreshToken);
  const rows = await sql.query<{
    user_id: string;
    client_id: string;
    resource: string;
    scopes: McpOAuthScope[] | string;
    family_id: string;
    expires_at: string;
    used_at: string | null;
    revoked_at: string | null;
  }>(
    [
      "SELECT user_id, client_id, resource, scopes, family_id, expires_at, used_at, revoked_at",
      "FROM oauth_refresh_tokens WHERE token_hash = $1 AND client_id = $2 LIMIT 1",
    ].join("\n"),
    [tokenHash, input.clientId],
  );
  const row = rows[0];
  if (!row || row.revoked_at || new Date(row.expires_at).getTime() <= Date.now()) return null;

  if (row.used_at) {
    // Detected refresh-token replay: revoke this family and its live access tokens.
    await sql.query(
      "UPDATE oauth_refresh_tokens SET revoked_at = NOW() WHERE family_id = $1 AND client_id = $2",
      [row.family_id, input.clientId],
    );
    await sql.query(
      "UPDATE oauth_access_tokens SET revoked_at = NOW() WHERE family_id = $1 AND client_id = $2",
      [row.family_id, input.clientId],
    );
    return null;
  }

  const scopes = jsonScope(row.scopes);
  const requested = input.requestedScopes;
  if (requested && requested.some((scope) => !scopes.includes(scope as McpOAuthScope))) return null;
  if (input.resource !== row.resource) return null;

  const consumed = await sql.query<{ token_hash: string }>(
    [
      "UPDATE oauth_refresh_tokens SET used_at = NOW(), revoked_at = NOW()",
      "WHERE token_hash = $1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > NOW()",
      "RETURNING token_hash",
    ].join("\n"),
    [tokenHash],
  );
  if (consumed.length === 0) return null;

  return issueOAuthTokens({
    userId: row.user_id,
    clientId: row.client_id,
    resource: row.resource,
    scopes: requested ? normalizeOAuthScopes(requested.join(" ")) : scopes,
    familyId: row.family_id,
  });
}

export async function validateOAuthClientSecret(client: OAuthClient, secret: string) {
  if (client.token_endpoint_auth_method === "none") return false;
  const candidate = Buffer.from(sha256Hex(secret), "hex");
  const expected = client.client_secret_hash ? Buffer.from(client.client_secret_hash, "hex") : Buffer.alloc(0);
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}

export async function revokeOAuthToken(input: {
  token: string;
  clientId: string;
}) {
  const sql = await getSql();
  const hash = sha256Hex(input.token);
  const access = await sql.query<{ id: number }>(
    [
      "UPDATE oauth_access_tokens SET revoked_at = NOW()",
      "WHERE token_hash = $1 AND client_id = $2 AND revoked_at IS NULL",
      "RETURNING id",
    ].join("\n"),
    [hash, input.clientId],
  );
  if (access.length) return;

  await sql.query(
    [
      "UPDATE oauth_refresh_tokens SET revoked_at = NOW()",
      "WHERE token_hash = $1 AND client_id = $2 AND revoked_at IS NULL",
    ].join("\n"),
    [hash, input.clientId],
  );
}

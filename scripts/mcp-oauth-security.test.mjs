import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  canonicalResource,
  isValidOAuthRedirectUri,
  normalizeOAuthScopes,
  pkceMatches,
  scopesAreSubset,
} from "../src/lib/activity/mcp-oauth-policy.mjs";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

function verifierAndChallenge() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier, "ascii").digest("base64url");
  return { verifier, challenge };
}

test("PKCE accepts only a matching S256 verifier", () => {
  const { verifier, challenge } = verifierAndChallenge();
  assert.equal(pkceMatches(verifier, challenge), true);
  assert.equal(pkceMatches(verifier + "x", challenge), false);
  assert.equal(pkceMatches("plain-text-verifier-that-is-long-enough-12345", challenge), false);
  assert.equal(pkceMatches(verifier, challenge.slice(0, -1) + "A"), false);
});

test("redirect URIs are exact and reject wildcards, fragments, and open web HTTP", () => {
  assert.equal(isValidOAuthRedirectUri("https://client.example/callback"), true);
  assert.equal(isValidOAuthRedirectUri("https://client.example/callback?code=1"), true);
  assert.equal(isValidOAuthRedirectUri("https://client.example/callback#token"), false);
  assert.equal(isValidOAuthRedirectUri("http://client.example/callback"), false);
  assert.equal(isValidOAuthRedirectUri("http://127.0.0.1:8080/callback", "web"), false);
  assert.equal(isValidOAuthRedirectUri("http://127.0.0.1:8080/callback", "native"), true);
  assert.equal(isValidOAuthRedirectUri("https://client.example/*"), true);
  assert.equal(isValidOAuthRedirectUri("myapp://callback"), false);
  assert.equal(isValidOAuthRedirectUri("com.example.app:/callback", "native"), true);
});

test("scopes fail closed and cannot be widened", () => {
  assert.deepEqual(normalizeOAuthScopes(""), ["activity:read"]);
  assert.deepEqual(normalizeOAuthScopes("activity:write offline_access"), ["activity:write", "offline_access"]);
  assert.throws(() => normalizeOAuthScopes("activity:admin"), /invalid_scope/);
  assert.throws(() => normalizeOAuthScopes("offline_access"), /invalid_scope/);
  assert.equal(scopesAreSubset(["activity:read"], ["activity:read", "activity:write"]), true);
  assert.equal(scopesAreSubset(["activity:write"], ["activity:read"]), false);
  assert.equal(scopesAreSubset([], ["activity:read"]), false);
});

test("resource URIs reject credentials, queries, and public HTTP", () => {
  assert.equal(canonicalResource("https://app.example/api/v1/mcp"), "https://app.example/api/v1/mcp");
  assert.equal(canonicalResource("https://app.example/api/v1/mcp/"), "https://app.example/api/v1/mcp");
  assert.equal(canonicalResource("https://user:pass@app.example/api/v1/mcp"), null);
  assert.equal(canonicalResource("https://app.example/api/v1/mcp?x=1"), null);
  assert.equal(canonicalResource("http://example.com/api/v1/mcp"), null);
  assert.equal(canonicalResource("http://127.0.0.1:8080/api/v1/mcp"), "http://127.0.0.1:8080/api/v1/mcp");
});

test("OAuth routes are registered at the discovery URLs, not as /server files", () => {
  const discovery = read("src/routes/[.]well-known/oauth-authorization-server.ts");
  const resource = read("src/routes/[.]well-known/oauth-protected-resource/api/v1/mcp.ts");
  const authorize = read("src/routes/oauth/authorize.ts");
  const token = read("src/routes/oauth/token.ts");
  const register = read("src/routes/oauth/register.ts");
  const revoke = read("src/routes/oauth/revoke.ts");

  assert.match(discovery, /createFileRoute\("\/\.well-known\/oauth-authorization-server"\)/);
  assert.match(resource, /createFileRoute\("\/\.well-known\/oauth-protected-resource\/api\/v1\/mcp"\)/);
  assert.match(authorize, /createFileRoute\("\/oauth\/authorize"\)/);
  assert.match(token, /createFileRoute\("\/oauth\/token"\)/);
  assert.match(register, /createFileRoute\("\/oauth\/register"\)/);
  assert.match(revoke, /createFileRoute\("\/oauth\/revoke"\)/);
  assert.doesNotMatch(discovery + resource + authorize + token, /createServerFileRoute/);
});

test("consent, PKCE exchange, scopes, and revocation stay server-enforced", () => {
  const authorize = read("src/routes/oauth/authorize.ts");
  const token = read("src/routes/oauth/token.ts");
  const revoke = read("src/routes/oauth/revoke.ts");
  const mcp = read("src/routes/api/v1/mcp.ts");
  const login = read("src/routes/login.tsx");

  assert.match(authorize, /code_challenge_method/);
  assert.match(authorize, /challengeMethod !== "S256"/);
  assert.match(authorize, /redirect_uri does not exactly match/);
  assert.match(authorize, /name="source"/);
  assert.match(authorize, /assertSameSiteRequest/);
  assert.match(authorize, /scopesAreSubset/);
  assert.match(token, /code_verifier/);
  assert.match(token, /consumeOAuthAuthorizationCode/);
  assert.match(token, /source: authorization\.source/);
  assert.match(token, /rotateOAuthRefreshToken/);
  assert.match(revoke, /revokeOAuthToken/);
  assert.match(mcp, /insufficient_scope/);
  assert.match(mcp, /principal\.scopes\.includes\(requiredScope\)/);
  assert.match(login, /candidate\.pathname === "\/oauth\/authorize"/);
});

test("migration 0006 creates OAuth tables, source attribution, and indexes", async () => {
  const sql = read("migrations/0006_mcp_oauth.sql");
  for (const name of [
    "oauth_clients",
    "oauth_consent_requests",
    "oauth_authorization_codes",
    "oauth_access_tokens",
    "oauth_refresh_tokens",
    "oauth_user_grants",
  ]) {
    assert.match(sql, new RegExp("CREATE TABLE IF NOT EXISTS " + name));
  }
  assert.match(sql, /code_challenge TEXT NOT NULL/);
  assert.match(sql, /source TEXT NOT NULL DEFAULT 'manual'/);
  assert.match(sql, /idx_oauth_refresh_family/);
  assert.match(sql, /UNIQUE \(user_id, client_id\)/);

  const db = new PGlite();
  await db.waitReady;
  const files = readdirSync(join(root, "migrations")).filter((name) => name.endsWith(".sql")).sort();
  for (const file of files) {
    await db.exec(readFileSync(join(root, "migrations", file), "utf8"));
  }
  const tables = await db.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'oauth\\_%' ORDER BY tablename");
  assert.deepEqual(tables.rows.map((row) => row.tablename), [
    "oauth_access_tokens",
    "oauth_authorization_codes",
    "oauth_clients",
    "oauth_consent_requests",
    "oauth_refresh_tokens",
    "oauth_user_grants",
  ]);
  const columns = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'oauth_authorization_codes' AND column_name = 'source'");
  assert.equal(columns.rows.length, 1);
  await db.close();
});

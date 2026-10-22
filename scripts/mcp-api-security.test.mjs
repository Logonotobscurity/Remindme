import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

test("MCP endpoint requires a valid token before dispatching tools", () => {
  const route = read("src/routes/api/v1/mcp.ts");
  assert.match(route, /authenticateMcpToken\(request\)/);
  assert.match(route, /if \(!principal\)/);
  assert.match(route, /status: 401/);
  assert.match(route, /WWW-Authenticate/);
  assert.match(route, /MAX_BODY_BYTES/);
  assert.match(route, /Content-Type must be application\/json/);
  assert.doesNotMatch(route, /params\.userId|arguments\.userId/);
});

test("MCP source attribution and privacy are derived server-side", () => {
  const route = read("src/routes/api/v1/mcp.ts");
  assert.match(route, /source: principal\.source/);
  assert.match(route, /captureMethod: "mcp"/);
  assert.match(route, /privacyLevel: "private"/);
  assert.match(route, /userId: principal\.userId/);

  const auth = read("src/lib/activity/mcp-access.server.ts");
  assert.match(auth, /createHash\("sha256"\)/);
  assert.match(auth, /randomBytes\(32\)/);
  assert.match(auth, /WHERE token_hash = \$1 AND revoked_at IS NULL/);
  assert.doesNotMatch(auth, /SELECT[^\n]*token_hash/);
});

test("MCP token management requires the signed-in owner for every operation", () => {
  const route = read("src/routes/api/v1/mcp-tokens.ts");
  assert.match(route, /authorizeActivityRequest\(request\)/);
  assert.match(route, /listMcpAccessTokens\(auth\.userId\)/);
  assert.match(route, /createMcpAccessToken\(\s*auth\.userId/);
  assert.match(route, /revokeMcpAccessToken\(auth\.userId/);
  assert.match(route, /Cache-Control.*no-store/);
});

test("MCP writes support stable source references for retries", () => {
  const migration = read("migrations/0005_mcp_activity_capture.sql");
  assert.match(migration, /token_hash TEXT NOT NULL UNIQUE/);
  assert.match(migration, /idx_decisions_user_source_reference/);
  assert.match(migration, /idx_action_items_user_source_reference/);

  const service = read("src/lib/activity/service.ts");
  assert.match(service, /ON CONFLICT \(user_id, source, source_reference\) WHERE source_reference IS NOT NULL/);
  assert.match(service, /export async function searchActivities/);
  assert.match(service, /WHERE user_id = \$1 AND \(/);
});

test("settings exposes the endpoint and revocation controls without embedding tokens in links", () => {
  assert.ok(existsSync(join(root, "src/components/McpIntegrationSettings.tsx")));
  const settings = read("src/components/McpIntegrationSettings.tsx");
  assert.match(settings, /\/api\/v1\/mcp/);
  assert.match(settings, /action: "create"/);
  assert.match(settings, /action: "revoke"/);
  assert.match(settings, /Copy secret token/);
  assert.match(settings, /Token is only displayed once|secret is only displayed once|only displayed once/);
});

test("MCP endpoint supports the current stateless 2026 protocol", () => {
  const route = read("src/routes/api/v1/mcp.ts");
  assert.match(route, /CURRENT_PROTOCOL = "2026-07-28"/);
  assert.match(route, /message\.method === "server\/discover"/);
  assert.match(route, /io\.modelcontextprotocol\/protocolVersion/);
  assert.match(route, /io\.modelcontextprotocol\/clientCapabilities/);
  assert.match(route, /request\.headers\.get\("mcp-method"\)/);
  assert.match(route, /request\.headers\.get\("mcp-name"\)/);
  assert.match(route, /-32020/);
  assert.match(route, /resultType: "complete"/);
  assert.match(route, /ttlMs: 0/);
  assert.match(route, /cacheScope: "private"/);
});

test("MCP HTTP endpoint validates explicit Origin values", () => {
  const route = read("src/routes/api/v1/mcp.ts");
  assert.match(route, /request\.headers\.get\("origin"\)/);
  assert.match(route, /parsedOrigin\.origin !== new URL\(request\.url\)\.origin/);
  assert.match(route, /status: 403/);
});

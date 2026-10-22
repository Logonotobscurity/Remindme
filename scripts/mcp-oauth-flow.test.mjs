import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import test from "node:test";
import { createServer } from "vite";

delete process.env.DATABASE_URL;

const origin = "http://127.0.0.1:8080";
const resource = origin + "/api/v1/mcp";
const protocol = "2026-07-28";

function pkce() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier, "ascii").digest("base64url");
  return { verifier, challenge };
}

function handler(route, method) {
  const options = route?.options ?? route;
  const found = options?.server?.handlers?.[method] ?? options?.handlers?.[method];
  if (typeof found !== "function") {
    throw new Error("Missing " + method + " handler. Route keys: " + Object.keys(route ?? {}).join(","));
  }
  return found;
}

function formRequest(url, fields) {
  const body = new URLSearchParams(fields).toString();
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "content-length": String(Buffer.byteLength(body)),
    },
    body,
  });
}

function mcpRequest(token, method, params, name) {
  const message = {
    jsonrpc: "2.0",
    id: 1,
    method,
    params: {
      ...params,
      _meta: {
        "io.modelcontextprotocol/protocolVersion": protocol,
        "io.modelcontextprotocol/clientCapabilities": { tools: {} },
      },
    },
  };
  const body = JSON.stringify(message);
  return new Request(resource, {
    method: "POST",
    headers: {
      authorization: "Bearer " + token,
      "content-type": "application/json",
      accept: "application/json",
      "content-length": String(Buffer.byteLength(body)),
      "mcp-protocol-version": protocol,
      "mcp-method": method,
      ...(name ? { "mcp-name": name } : {}),
    },
    body,
  });
}

test("OAuth client can exchange PKCE, call MCP, and cannot read another user", async () => {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
  });
  try {
    const oauth = await vite.ssrLoadModule("/src/lib/activity/mcp-oauth.server.ts");
    const discovery = await vite.ssrLoadModule("/src/routes/[.]well-known/oauth-authorization-server.ts");
    const tokenRoute = await vite.ssrLoadModule("/src/routes/oauth/token.ts");
    const revokeRoute = await vite.ssrLoadModule("/src/routes/oauth/revoke.ts");
    const mcpRoute = await vite.ssrLoadModule("/src/routes/api/v1/mcp.ts");
    const tokenPost = handler(tokenRoute.Route, "POST");
    const revokePost = handler(revokeRoute.Route, "POST");
    const mcpPost = handler(mcpRoute.Route, "POST");
    const discoveryGet = handler(discovery.Route, "GET");

    const metadata = await discoveryGet({ request: new Request(origin + "/.well-known/oauth-authorization-server") });
    assert.equal(metadata.status, 200);
    const discovered = await metadata.json();
    assert.equal(discovered.token_endpoint, origin + "/oauth/token");
    assert.deepEqual(discovered.code_challenge_methods_supported, ["S256"]);

    const client = await oauth.registerOAuthClient({
      clientName: "OAuth flow test",
      redirectUris: ["http://127.0.0.1:8080/callback"],
      authMethod: "none",
      applicationType: "native",
      grantTypes: ["authorization_code", "refresh_token"],
    });

    const first = pkce();
    const code = await oauth.createOAuthAuthorizationCode({
      userId: "owner-a",
      clientId: client.client_id,
      redirectUri: "http://127.0.0.1:8080/callback",
      resource,
      codeChallenge: first.challenge,
      scopes: ["activity:read", "activity:write", "offline_access"],
      source: "grok",
    });

    const wrong = await tokenPost({
      request: formRequest(origin + "/oauth/token", {
        grant_type: "authorization_code",
        client_id: client.client_id,
        code,
        redirect_uri: "http://127.0.0.1:8080/callback",
        code_verifier: first.verifier + "x",
        resource,
      }),
    });
    assert.equal(wrong.status, 400);
    assert.equal((await wrong.json()).error, "invalid_grant");

    const exchanged = await tokenPost({
      request: formRequest(origin + "/oauth/token", {
        grant_type: "authorization_code",
        client_id: client.client_id,
        code,
        redirect_uri: "http://127.0.0.1:8080/callback",
        code_verifier: first.verifier,
        resource,
      }),
    });
    assert.equal(exchanged.status, 200);
    const tokens = await exchanged.json();
    assert.equal(tokens.token_type, "Bearer");
    assert.match(tokens.access_token, /^rmm_oat_/);
    assert.ok(tokens.refresh_token);
    assert.match(tokens.scope, /activity:write/);

    const captured = await mcpPost({
      request: mcpRequest(tokens.access_token, "tools/call", {
        name: "capture_activity",
        arguments: {
          title: "OAuth capture check",
          summary: "Written by OAuth",
          project: "Re:Mind Me",
          activityType: "note",
        },
      }, "capture_activity"),
    });
    assert.equal(captured.status, 200);
    const capturedBody = await captured.json();
    assert.equal(capturedBody.result.structuredContent.saved, true);
    assert.equal(capturedBody.result.structuredContent.source, "grok");
    assert.equal(capturedBody.result.structuredContent.privacy, "private");

    const ownSearch = await mcpPost({
      request: mcpRequest(tokens.access_token, "tools/call", {
        name: "search_memory",
        arguments: { query: "OAuth capture check" },
      }, "search_memory"),
    });
    const ownBody = await ownSearch.json();
    assert.equal(ownBody.result.structuredContent.count, 1);
    assert.equal(ownBody.result.structuredContent.results[0].source, "grok");
    assert.equal(ownBody.result.structuredContent.results[0].title, "OAuth capture check");

    const other = pkce();
    const otherCode = await oauth.createOAuthAuthorizationCode({
      userId: "owner-b",
      clientId: client.client_id,
      redirectUri: "http://127.0.0.1:8080/callback",
      resource,
      codeChallenge: other.challenge,
      scopes: ["activity:read", "offline_access"],
      source: "claude",
    });
    const otherExchange = await tokenPost({
      request: formRequest(origin + "/oauth/token", {
        grant_type: "authorization_code",
        client_id: client.client_id,
        code: otherCode,
        redirect_uri: "http://127.0.0.1:8080/callback",
        code_verifier: other.verifier,
        resource,
      }),
    });
    assert.equal(otherExchange.status, 200);
    const otherTokens = await otherExchange.json();
    const otherSearch = await mcpPost({
      request: mcpRequest(otherTokens.access_token, "tools/call", {
        name: "search_memory",
        arguments: { query: "OAuth capture check" },
      }, "search_memory"),
    });
    const otherBody = await otherSearch.json();
    assert.equal(otherBody.result.structuredContent.count, 0);

    const denied = await mcpPost({
      request: mcpRequest(otherTokens.access_token, "tools/call", {
        name: "capture_activity",
        arguments: { title: "Should be refused" },
      }, "capture_activity"),
    });
    assert.equal(denied.status, 403);
    const deniedBody = await denied.json();
    assert.equal(deniedBody.error, "insufficient_scope");
    assert.match(denied.headers.get("www-authenticate") ?? "", /resource_metadata=/);

    const refreshed = await tokenPost({
      request: formRequest(origin + "/oauth/token", {
        grant_type: "refresh_token",
        client_id: client.client_id,
        refresh_token: tokens.refresh_token,
        resource,
      }),
    });
    assert.equal(refreshed.status, 200);
    const nextTokens = await refreshed.json();
    assert.notEqual(nextTokens.access_token, tokens.access_token);
    assert.ok(nextTokens.refresh_token);
    assert.notEqual(nextTokens.refresh_token, tokens.refresh_token);

    const replay = await tokenPost({
      request: formRequest(origin + "/oauth/token", {
        grant_type: "refresh_token",
        client_id: client.client_id,
        refresh_token: tokens.refresh_token,
        resource,
      }),
    });
    assert.equal(replay.status, 400);
    assert.equal((await replay.json()).error, "invalid_grant");

    const afterReplay = await mcpPost({
      request: mcpRequest(nextTokens.access_token, "tools/call", {
        name: "search_memory",
        arguments: { query: "OAuth capture check" },
      }, "search_memory"),
    });
    assert.equal(afterReplay.status, 401);

    const revoked = await revokePost({
      request: formRequest(origin + "/oauth/revoke", {
        client_id: client.client_id,
        token: otherTokens.access_token,
      }),
    });
    assert.equal(revoked.status, 200);
    const afterRevoke = await mcpPost({
      request: mcpRequest(otherTokens.access_token, "tools/call", {
        name: "search_memory",
        arguments: { query: "OAuth capture check" },
      }, "search_memory"),
    });
    assert.equal(afterRevoke.status, 401);
  } finally {
    await vite.close();
  }
});

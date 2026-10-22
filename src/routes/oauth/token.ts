import { createFileRoute } from "@tanstack/react-router";
import { canonicalMcpResource, findOAuthClient, issueOAuthTokens, rotateOAuthRefreshToken, validateOAuthClientSecret, validResourceValue } from "@/lib/activity/mcp-oauth.server";
import { normalizeOAuthScopes } from "@/lib/activity/mcp-oauth-policy.mjs";

function tokenError(error: string, status = 400, description?: string) {
  return Response.json({
    error,
    ...(description ? { error_description: description } : {}),
  }, {
    status,
    headers: {
      "Cache-Control": "no-store",
      Pragma: "no-cache",
      ...(status === 401 ? { "WWW-Authenticate": 'Basic realm="Re:Mind Me OAuth"' } : {}),
    },
  });
}

function decodeFormEncodedBasic(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

function basicCredentials(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Basic\s+([A-Za-z0-9+/=_-]+)$/i);
  if (!match) return null;
  try {
    const decoded = Buffer.from(match[1], "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return {
      clientId: decodeFormEncodedBasic(decoded.slice(0, separator)),
      clientSecret: decodeFormEncodedBasic(decoded.slice(separator + 1)),
    };
  } catch {
    return null;
  }
}

async function readForm(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/x-www-form-urlencoded") return null;
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 16 * 1024) return null;
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 16 * 1024) return null;
  return new URLSearchParams(text);
}

async function authenticateClient(request: Request, form: URLSearchParams) {
  const basic = basicCredentials(request);
  const bodyClientId = form.get("client_id");
  const clientId = basic?.clientId ?? bodyClientId;
  if (!clientId || (basic && bodyClientId && bodyClientId !== basic.clientId)) {
    return { client: null, error: "invalid_client" as const };
  }
  const client = await findOAuthClient(clientId);
  if (!client) return { client: null, error: "invalid_client" as const };

  if (client.token_endpoint_auth_method === "none") {
    if (basic || form.has("client_secret")) {
      return { client: null, error: "invalid_client" as const };
    }
    return { client, error: null };
  }

  if (client.token_endpoint_auth_method === "client_secret_basic") {
    if (!basic || form.has("client_secret") ||
        !(await validateOAuthClientSecret(client, basic.clientSecret))) {
      return { client: null, error: "invalid_client" as const };
    }
    return { client, error: null };
  }

  const bodySecret = form.get("client_secret");
  if (basic || !bodySecret || !(await validateOAuthClientSecret(client, bodySecret))) {
    return { client: null, error: "invalid_client" as const };
  }
  return { client, error: null };
}

export const Route = createFileRoute("/oauth/token")({
  server: {
    handlers: {
  GET: async () => new Response("OAuth token endpoint requires POST.", {
    status: 405,
    headers: { Allow: "POST", "Cache-Control": "no-store" },
  }),

  POST: async ({ request }) => {
    let form: URLSearchParams | null;
    try {
      form = await readForm(request);
    } catch {
      return tokenError("invalid_request");
    }
    if (!form) return tokenError("invalid_request", 415, "Content-Type must be application/x-www-form-urlencoded.");

    const authenticated = await authenticateClient(request, form);
    if (!authenticated.client) return tokenError(authenticated.error ?? "invalid_client", 401);
    const client = authenticated.client;
    const grantType = form.get("grant_type");
    const grantTypes = Array.isArray(client.grant_types) ? client.grant_types : [];
    if (!grantType || !grantTypes.includes(grantType)) {
      return tokenError("unauthorized_client", 400, "This client is not allowed to use the requested grant.");
    }

    const resource = form.get("resource");
    const canonical = canonicalMcpResource(request.url);
    if (!resource || !validResourceValue(resource, canonical)) {
      return tokenError("invalid_target", 400, "The resource parameter must match this MCP server's canonical URL.");
    }

    try {
      if (grantType === "authorization_code") {
        const code = form.get("code");
        const redirectUri = form.get("redirect_uri");
        const verifier = form.get("code_verifier");
        if (!code || !redirectUri || !verifier) {
          return tokenError("invalid_request", 400, "code, redirect_uri, and code_verifier are required.");
        }
        const redirectUris = Array.isArray(client.redirect_uris) ? client.redirect_uris : [];
        if (!redirectUris.includes(redirectUri)) return tokenError("invalid_grant");
        const authorization = await (await import("@/lib/activity/mcp-oauth.server")).consumeOAuthAuthorizationCode({
          code,
          clientId: client.client_id,
          redirectUri,
          resource,
          codeVerifier: verifier,
        });
        if (!authorization) return tokenError("invalid_grant");
        const tokens = await issueOAuthTokens({
          userId: authorization.user_id,
          clientId: client.client_id,
          resource,
          scopes: authorization.scopes,
          source: authorization.source,
        });
        return Response.json(tokens, {
          headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
        });
      }

      if (grantType === "refresh_token") {
        const refreshToken = form.get("refresh_token");
        if (!refreshToken) return tokenError("invalid_request", 400, "refresh_token is required.");
        let requestedScopes: string[] | null = null;
        const scopeValue = form.get("scope");
        if (scopeValue !== null) {
          try {
            requestedScopes = normalizeOAuthScopes(scopeValue);
          } catch {
            return tokenError("invalid_scope");
          }
        }
        const tokens = await rotateOAuthRefreshToken({
          refreshToken,
          clientId: client.client_id,
          resource,
          requestedScopes,
        });
        if (!tokens) return tokenError("invalid_grant");
        return Response.json(tokens, {
          headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
        });
      }

      return tokenError("unsupported_grant_type");
    } catch (error) {
      console.error("[mcp-oauth] Token issuance failed", error);
      return tokenError("server_error", 500);
    }
  },
    },
  },
});

import { createServerFileRoute } from "@tanstack/react-start/server";
import { findOAuthClient, revokeOAuthToken, validateOAuthClientSecret } from "@/lib/activity/mcp-oauth.server";

function noStore(body: unknown, status = 200, extraHeaders?: HeadersInit) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    Pragma: "no-cache",
    ...Object.fromEntries(new Headers(extraHeaders).entries()),
  });
  if (body === null) return new Response(null, { status, headers });
  return Response.json(body, { status, headers });
}

function parseBasic(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Basic\s+([A-Za-z0-9+/=_-]+)$/i);
  if (!match) return null;
  try {
    const decoded = Buffer.from(match[1], "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return { clientId: decoded.slice(0, separator), secret: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
}

export const Route = createServerFileRoute("/oauth/revoke")({
  GET: async () => new Response("OAuth token revocation requires POST.", {
    status: 405,
    headers: { Allow: "POST", "Cache-Control": "no-store" },
  }),

  POST: async ({ request }) => {
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/x-www-form-urlencoded") {
      return noStore({ error: "invalid_request" }, 415);
    }
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > 16 * 1024) return noStore({ error: "invalid_request" }, 413);

    let form: URLSearchParams;
    try {
      const body = await request.text();
      if (new TextEncoder().encode(body).byteLength > 16 * 1024) return noStore({ error: "invalid_request" }, 413);
      form = new URLSearchParams(body);
    } catch {
      return noStore({ error: "invalid_request" }, 400);
    }

    const basic = parseBasic(request);
    const bodyClientId = form.get("client_id");
    const clientId = basic?.clientId ?? bodyClientId;
    if (!clientId || (basic && bodyClientId && basic.clientId !== bodyClientId)) {
      return noStore({ error: "invalid_client" }, 401, { "WWW-Authenticate": 'Basic realm="Re:Mind Me OAuth"' });
    }

    const client = await findOAuthClient(clientId);
    if (!client) return noStore({ error: "invalid_client" }, 401, { "WWW-Authenticate": 'Basic realm="Re:Mind Me OAuth"' });
    if (client.token_endpoint_auth_method === "none") {
      if (basic || form.has("client_secret")) return noStore({ error: "invalid_client" }, 401);
    } else if (client.token_endpoint_auth_method === "client_secret_basic") {
      if (!basic || form.has("client_secret") || !(await validateOAuthClientSecret(client, basic.secret))) {
        return noStore({ error: "invalid_client" }, 401, { "WWW-Authenticate": 'Basic realm="Re:Mind Me OAuth"' });
      }
    } else {
      const secret = form.get("client_secret");
      if (basic || !secret || !(await validateOAuthClientSecret(client, secret))) {
        return noStore({ error: "invalid_client" }, 401);
      }
    }

    const token = form.get("token");
    if (token) {
      try {
        // RFC 7009 returns 200 even for unknown or already-revoked tokens.
        await revokeOAuthToken({ token, clientId: client.client_id });
      } catch (error) {
        console.error("[mcp-oauth] Revocation failed", error);
        return noStore({ error: "server_error" }, 500);
      }
    }
    return noStore(null, 200);
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { registerOAuthClient, type OAuthApplicationType, type OAuthClientAuthMethod } from "@/lib/activity/mcp-oauth.server";

const authMethods = ["none", "client_secret_basic", "client_secret_post"] as const;
const applicationTypes = ["web", "native"] as const;

const registrationSchema = z.object({
  client_name: z.string().trim().min(1).max(120).optional(),
  redirect_uris: z.array(z.string().min(1).max(2048)).min(1).max(10),
  grant_types: z.array(z.enum(["authorization_code", "refresh_token"])).min(1).optional(),
  response_types: z.array(z.enum(["code"])).min(1).optional(),
  token_endpoint_auth_method: z.enum(authMethods).optional(),
  application_type: z.enum(applicationTypes).optional(),
  scope: z.string().max(200).optional(),
  contacts: z.array(z.string().max(254)).max(5).optional(),
}).strict();

function jsonError(error: string, description: string, status = 400) {
  return Response.json({ error, error_description: description }, {
    status,
    headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
  });
}

function inferredApplicationType(redirectUris: string[]): OAuthApplicationType {
  return redirectUris.some((value) => {
    try {
      const url = new URL(value);
      return url.hostname === "localhost" || url.hostname === "127.0.0.1" ||
        url.hostname === "[::1]" || (url.protocol !== "https:" && url.protocol !== "http:");
    } catch {
      return false;
    }
  }) ? "native" : "web";
}

export const Route = createFileRoute("/oauth/register")({
  server: {
    handlers: {
  GET: async () => new Response("OAuth Dynamic Client Registration requires POST.", {
    status: 405,
    headers: { Allow: "POST", "Cache-Control": "no-store" },
  }),

  POST: async ({ request }) => {
    const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (contentType !== "application/json") {
      return jsonError("invalid_request", "Content-Type must be application/json.", 415);
    }
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > 16 * 1024) {
      return jsonError("invalid_client_metadata", "Registration payload exceeds 16 KB.", 413);
    }

    let body: unknown;
    try {
      const text = await request.text();
      if (new TextEncoder().encode(text).byteLength > 16 * 1024) {
        return jsonError("invalid_client_metadata", "Registration payload exceeds 16 KB.", 413);
      }
      body = JSON.parse(text);
    } catch {
      return jsonError("invalid_request", "Request body must be valid JSON.");
    }

    const parsed = registrationSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("invalid_client_metadata", "Only authorization-code clients with exact redirect URIs are supported.");
    }

    const payload = parsed.data;
    const redirectUris = [...new Set(payload.redirect_uris)];
    if (redirectUris.length !== payload.redirect_uris.length) {
      return jsonError("invalid_redirect_uri", "Duplicate redirect URIs are not allowed.");
    }
    const grantTypes = payload.grant_types ?? ["authorization_code", "refresh_token"];
    if (!grantTypes.includes("authorization_code")) {
      return jsonError("invalid_client_metadata", "grant_types must include authorization_code.");
    }
    const responseTypes = payload.response_types ?? ["code"];
    if (!responseTypes.includes("code")) {
      return jsonError("invalid_client_metadata", "response_types must include code.");
    }
    const applicationType = payload.application_type ?? inferredApplicationType(redirectUris);
    const authMethod = (payload.token_endpoint_auth_method ?? "none") as OAuthClientAuthMethod;

    try {
      const client = await registerOAuthClient({
        clientName: payload.client_name ?? "MCP client",
        redirectUris,
        authMethod,
        applicationType,
        grantTypes,
      });
      return Response.json(client, {
        status: 201,
        headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      if (reason === "invalid_redirect_uri") {
        return jsonError("invalid_redirect_uri", "Redirect URIs must use HTTPS, native-app loopback, or an accepted native-app custom scheme.");
      }
      return jsonError("invalid_client_metadata", "Client metadata failed validation.");
    }
  },
    },
  },
});

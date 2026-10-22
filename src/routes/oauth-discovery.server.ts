import { createServerFileRoute } from "@tanstack/react-start/server";

export const Route = createServerFileRoute("/.well-known/oauth-authorization-server")({
  GET: async ({ request }) => {
    const origin = new URL(request.url).origin;
    return Response.json({
      issuer: origin,
      authorization_endpoint: origin + "/oauth/authorize",
      token_endpoint: origin + "/oauth/token",
      registration_endpoint: origin + "/oauth/register",
      revocation_endpoint: origin + "/oauth/revoke",
      response_types_supported: ["code"],
      response_modes_supported: ["query"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none", "client_secret_basic", "client_secret_post"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: ["activity:read", "activity:write", "offline_access"],
      client_id_metadata_document_supported: false,
      authorization_response_iss_parameter_supported: true,
    }, {
      headers: {
        "Cache-Control": "public, max-age=300",
        "Content-Type": "application/json",
      },
    });
  },
});

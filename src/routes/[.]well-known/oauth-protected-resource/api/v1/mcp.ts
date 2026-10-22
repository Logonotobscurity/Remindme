import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/.well-known/oauth-protected-resource/api/v1/mcp")({
  server: {
    handlers: {
  GET: async ({ request }) => {
    const origin = new URL(request.url).origin;
    return Response.json({
      resource: origin + "/api/v1/mcp",
      authorization_servers: [origin],
      bearer_methods_supported: ["header"],
      resource_name: "Re:Mind Me Activity Memory",
      scopes_supported: ["activity:read", "activity:write"],
    }, {
      headers: {
        "Cache-Control": "public, max-age=300",
        "Content-Type": "application/json",
      },
    });
  },
    },
  },
});

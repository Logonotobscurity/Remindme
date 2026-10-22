import { createServerFileRoute } from "@tanstack/react-start/server";
import { z } from "zod";
import { authorizeActivityRequest } from "@/lib/activity/api-auth.server";
import {
  createMcpAccessToken,
  listMcpAccessTokens,
  MCP_SOURCES,
  revokeMcpAccessToken,
} from "@/lib/activity/mcp-access.server";

const sourceSchema = z.enum(MCP_SOURCES);
const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    label: z.string().trim().min(1).max(80),
    source: sourceSchema,
  }).strict(),
  z.object({
    action: z.literal("revoke"),
    id: z.number().int().positive(),
  }).strict(),
]);

export const Route = createServerFileRoute("/api/v1/mcp-tokens")({
  GET: async ({ request }) => {
    const auth = await authorizeActivityRequest(request);
    if ("response" in auth) return auth.response;

    try {
      const tokens = await listMcpAccessTokens(auth.userId);
      return Response.json(tokens, {
        headers: { "Cache-Control": "private, no-store" },
      });
    } catch (error) {
      console.error("[mcp-tokens] Could not list tokens", error);
      return Response.json(
        { error: "Token management is temporarily unavailable." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
  },

  POST: async ({ request }) => {
    const auth = await authorizeActivityRequest(request);
    if ("response" in auth) return auth.response;

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const parsed = actionSchema.safeParse(payload);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid token request. Check the label, source, or token id." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    try {
      if (parsed.data.action === "create") {
        const created = await createMcpAccessToken(
          auth.userId,
          parsed.data.label,
          parsed.data.source,
        );
        return Response.json(created, {
          status: 201,
          headers: { "Cache-Control": "no-store" },
        });
      }

      const revoked = await revokeMcpAccessToken(auth.userId, parsed.data.id);
      if (!revoked) {
        return Response.json(
          { error: "Active token not found." },
          { status: 404, headers: { "Cache-Control": "no-store" } },
        );
      }
      return Response.json({ revoked: true }, {
        headers: { "Cache-Control": "no-store" },
      });
    } catch (error) {
      console.error("[mcp-tokens] Token action failed", error);
      return Response.json(
        { error: "Token management is temporarily unavailable." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
  },
});

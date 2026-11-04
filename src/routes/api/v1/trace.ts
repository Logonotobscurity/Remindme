import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authorizeActivityRequest } from "@/lib/activity/api-auth.server";
import { traceLog } from "@/lib/gates/trace";

const querySchema = z.object({
  actionId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const Route = createFileRoute("/api/v1/trace")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await authorizeActivityRequest(request);
        if ("response" in auth) return auth.response;

        const url = new URL(request.url);
        const parsed = querySchema.safeParse({
          actionId: url.searchParams.get("actionId") ?? undefined,
          limit: url.searchParams.get("limit") ?? undefined,
        });
        if (!parsed.success) {
          return Response.json({ error: "Invalid query" }, { status: 400 });
        }

        const entries = parsed.data.actionId
          ? traceLog.forAction(parsed.data.actionId)
          : traceLog.recent(parsed.data.limit);

        return Response.json(
          { entries },
          { headers: { "Cache-Control": "private, no-store" } },
        );
      },
    },
  },
});

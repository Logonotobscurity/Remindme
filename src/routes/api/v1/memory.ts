import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authorizeActivityRequest } from "@/lib/activity/api-auth.server";
import { serverMemory } from "@/lib/memory/server";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().optional(),
});

export const Route = createFileRoute("/api/v1/memory")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await authorizeActivityRequest(request);
        if ("response" in auth) return auth.response;

        const url = new URL(request.url);
        const parsed = querySchema.safeParse({
          limit: url.searchParams.get("limit") ?? undefined,
          q: url.searchParams.get("q") ?? undefined,
        });
        if (!parsed.success) {
          return Response.json({ error: "Invalid query" }, { status: 400 });
        }

        const records = await serverMemory.retrieveForPrompt(
          auth.userId,
          parsed.data.q ?? "",
          parsed.data.limit,
        );

        return Response.json(
          { records, redacted: true },
          { headers: { "Cache-Control": "private, no-store" } },
        );
      },
    },
  },
});

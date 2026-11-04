import { createFileRoute } from "@tanstack/react-router";
import { authorizeActivityRequest } from "@/lib/activity/api-auth.server";
import { serverMemory } from "@/lib/memory/server";
import { buildT24hBriefing } from "@/lib/briefings/t24h";

export const Route = createFileRoute("/api/v1/briefings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await authorizeActivityRequest(request);
        if ("response" in auth) return auth.response;

        const url = new URL(request.url);
        const horizon = url.searchParams.get("horizon") ?? "t24h";

        if (horizon !== "t24h") {
          return Response.json({ error: "Only horizon=t24h is supported in this prototype" }, { status: 400 });
        }

        const records = await serverMemory.retrieveForPrompt(auth.userId, "", 40);
        const briefing = buildT24hBriefing(auth.userId, records);

        return Response.json(briefing, {
          headers: { "Cache-Control": "private, no-store" },
        });
      },
    },
  },
});

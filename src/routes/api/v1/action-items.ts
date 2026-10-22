import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authorizeActivityRequest } from "@/lib/activity/api-auth.server";
import { listPendingActions } from "@/lib/activity/service";

const statusSchema = z.enum(["pending", "completed", "all"]);

export const Route = createFileRoute("/api/v1/action-items")({
  server: {
    handlers: {
  GET: async ({ request }) => {
    const auth = await authorizeActivityRequest(request);
    if ("response" in auth) return auth.response;

    const status = statusSchema.safeParse(
      new URL(request.url).searchParams.get("status") ?? "pending",
    );
    if (!status.success) {
      return Response.json(
        { error: "Invalid status. Use pending, completed, or all." },
        { status: 400 },
      );
    }

    const rows = await listPendingActions(auth.userId, status.data);
    return Response.json(rows, {
      headers: { "Cache-Control": "private, no-store" },
    });
  },
    },
  },
});

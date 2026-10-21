import { createServerFileRoute } from "@tanstack/react-start/server";
import { z } from "zod";
import { authorizeActivityRequest } from "@/lib/activity/api-auth.server";
import { createActivity, listActivities } from "@/lib/activity/service";

const activitySchema = z.object({
  source: z.enum(["claude", "grok", "chatgpt", "pwa", "log_on", "voice", "manual", "system"]),
  project: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  title: z.string().trim().min(1).max(240),
  summary: z.string().trim().max(4000).optional(),
  activityType: z.enum(["research", "engineering", "decision", "idea", "meeting", "note", "reminder", "journal", "sync", "other"]).optional(),
  sourceReference: z.string().trim().min(1).max(500).optional(),
  captureMethod: z.enum(["mcp", "api", "import", "manual", "voice", "log_on", "automation"]).optional(),
  privacyLevel: z.enum(["public", "private", "internal"]).optional(),
  completionStatus: z.enum(["recorded", "in_progress", "completed", "archived"]).optional(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
}).strict();

const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});

const activityQuerySchema = z.object({
  date: calendarDateSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const Route = createServerFileRoute("/api/v1/activity")({
  GET: async ({ request }) => {
    const auth = await authorizeActivityRequest(request);
    if ("response" in auth) return auth.response;

    const url = new URL(request.url);
    const query = activityQuerySchema.safeParse({
      date: url.searchParams.get("date") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!query.success) {
      return Response.json(
        { error: "Invalid query. limit must be 1–100 and date must use YYYY-MM-DD." },
        { status: 400 },
      );
    }

    const rows = await listActivities(auth.userId, query.data);
    return Response.json(rows, {
      headers: { "Cache-Control": "private, no-store" },
    });
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

    const parsed = activitySchema.safeParse(payload);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const activityId = await createActivity(auth.userId, parsed.data);
    return Response.json(
      { id: activityId },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  },
});

import { createServerFileRoute } from "@tanstack/react-start/server";
import { z } from "zod";
import { createActivity, listActivities, listPendingActions, listReminders } from "@/lib/activity/service";

const activitySchema = z.object({
  source: z.enum(["claude", "grok", "chatgpt", "pwa", "log_on", "voice", "manual", "system"]),
  project: z.string().optional(),
  category: z.string().optional(),
  title: z.string().min(1),
  summary: z.string().optional(),
  activityType: z.enum(["research", "engineering", "decision", "idea", "meeting", "note", "reminder", "journal", "sync", "other"]).optional(),
  sourceReference: z.string().optional(),
  captureMethod: z.enum(["mcp", "api", "import", "manual", "voice", "log_on", "automation"]).optional(),
  privacyLevel: z.enum(["public", "private", "internal"]).optional(),
  completionStatus: z.enum(["recorded", "in_progress", "completed", "archived"]).optional(),
  occurredAt: z.string().optional(),
});

export const Route = createServerFileRoute("/api/v1/activity")({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? undefined;
    const limit = Number(url.searchParams.get("limit") ?? "50");
    const rows = await listActivities({ date, limit: Number.isFinite(limit) ? limit : 50 });
    return Response.json(rows);
  },
  POST: async ({ request }) => {
    const payload = await request.json();
    const parsed = activitySchema.safeParse(payload);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const activityId = await createActivity(parsed.data);
    return Response.json({ id: activityId }, { status: 201 });
  },
});

export const ActionItemsRoute = createServerFileRoute("/api/v1/action-items")({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "pending";
    const rows = await listPendingActions();
    if (status !== "pending") return Response.json(rows);
    return Response.json(rows);
  },
});

export const RemindersRoute = createServerFileRoute("/api/v1/reminders")({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const dueDate = url.searchParams.get("due_date") ?? undefined;
    const rows = await listReminders({ dueDate });
    return Response.json(rows);
  },
});

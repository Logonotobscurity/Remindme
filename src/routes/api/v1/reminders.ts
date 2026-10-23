import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authorizeActivityRequest } from "@/lib/activity/api-auth.server";
import { listReminders, saveReminder } from "@/lib/activity/service";

const dueDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});

const reminderWriteSchema = z.object({
  reminderKey: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(240),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
}).strict();

export const Route = createFileRoute("/api/v1/reminders")({
  server: {
    handlers: {
  GET: async ({ request }) => {
    const auth = await authorizeActivityRequest(request);
    if ("response" in auth) return auth.response;

    const rawDueDate = new URL(request.url).searchParams.get("due_date");
    const dueDate = rawDueDate === null ? undefined : dueDateSchema.safeParse(rawDueDate);
    if (dueDate && !dueDate.success) {
      return Response.json({ error: "due_date must use YYYY-MM-DD format." }, { status: 400 });
    }

    const rows = await listReminders({
      userId: auth.userId,
      dueDate: dueDate?.success ? dueDate.data : undefined,
    });
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

    const parsed = reminderWriteSchema.safeParse(payload);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const saved = await saveReminder(auth.userId, parsed.data);
    if (!saved) {
      return Response.json({ error: "Reminder was not saved." }, { status: 500 });
    }
    return Response.json(saved, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  },
    },
  },
});

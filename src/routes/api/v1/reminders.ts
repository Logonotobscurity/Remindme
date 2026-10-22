import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authorizeActivityRequest } from "@/lib/activity/api-auth.server";
import { listReminders } from "@/lib/activity/service";

const dueDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});

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
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authorizeActivityRequest } from "@/lib/activity/api-auth.server";
import { ingest } from "@/lib/ingestion/pipeline";
import type { IngestionInput } from "@/lib/ingestion/schemas";

const base = z.object({
  kind: z.enum(["contact", "task", "note", "doc", "reminder", "signal"]),
});

const contactSchema = base.extend({
  kind: z.literal("contact"),
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string()).optional(),
});

const taskSchema = base.extend({
  kind: z.literal("task"),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  dueAt: z.string().datetime({ offset: true }).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  project: z.string().max(120).optional(),
  status: z.enum(["open", "in_progress", "done"]).optional(),
});

const noteSchema = base.extend({
  kind: z.literal("note"),
  title: z.string().max(200).optional(),
  body: z.string().min(1).max(8000),
  tags: z.array(z.string()).optional(),
  source: z.string().max(80).optional(),
});

const docSchema = base.extend({
  kind: z.literal("doc"),
  title: z.string().min(1).max(300),
  url: z.string().url().optional(),
  summary: z.string().max(2000).optional(),
  mimeType: z.string().max(80).optional(),
  tags: z.array(z.string()).optional(),
});

const reminderSchema = base.extend({
  kind: z.literal("reminder"),
  text: z.string().min(1).max(500),
  dueAt: z.string().datetime({ offset: true }),
  location: z.string().max(200).optional(),
  recurring: z.boolean().optional(),
});

const signalSchema = base.extend({
  kind: z.literal("signal"),
  source: z.string().min(1).max(80),
  event: z.string().min(1).max(200),
  payload: z.record(z.unknown()).optional(),
  severity: z.enum(["info", "warning", "critical"]).optional(),
});

const ingestSchema = z.discriminatedUnion("kind", [
  contactSchema,
  taskSchema,
  noteSchema,
  docSchema,
  reminderSchema,
  signalSchema,
]);

export const Route = createFileRoute("/api/v1/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authorizeActivityRequest(request);
        if ("response" in auth) return auth.response;

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = ingestSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: parsed.error.flatten() }, { status: 400 });
        }

        const result = await ingest(auth.userId, parsed.data as IngestionInput);
        return Response.json({ ok: true, id: result.id, kind: result.kind }, { status: 201 });
      },
    },
  },
});

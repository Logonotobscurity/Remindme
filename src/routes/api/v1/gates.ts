import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authorizeActivityRequest } from "@/lib/activity/api-auth.server";
import { createProposedAction, checkGates, approveGate, type GateName } from "@/lib/gates/types";
import { traceLog } from "@/lib/gates/trace";

const proposeSchema = z.object({
  intent: z.string().min(1).max(500),
  target: z.string().min(1).max(200),
  payload: z.record(z.unknown()).default({}),
  rail: z.string().optional(),
});

const reviewSchema = z.object({
  actionId: z.string(),
  gate: z.enum(["meaning", "scope", "rail", "trace"]),
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().optional(),
});

// In-memory store for proposed actions (swap for DB + audit log)
const reviews = new Map<string, ReturnType<typeof checkGates>>();

export const Route = createFileRoute("/api/v1/gates")({
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

        const parsed = proposeSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: parsed.error.flatten() }, { status: 400 });
        }

        const action = createProposedAction({
          intent: parsed.data.intent,
          target: parsed.data.target,
          payload: parsed.data.payload,
          rail: parsed.data.rail,
          createdBy: auth.userId,
        });

        const review = checkGates(action);
        reviews.set(action.id, review);

        traceLog.append({
          actionId: action.id,
          event: "proposed",
          actor: auth.userId,
          snapshot: { intent: action.intent, target: action.target, scope: action.scope },
        });

        return Response.json({ review }, { status: 201 });
      },

      // Simple review endpoint (approve/reject a gate)
      PUT: async ({ request }) => {
        const auth = await authorizeActivityRequest(request);
        if ("response" in auth) return auth.response;

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = reviewSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: parsed.error.flatten() }, { status: 400 });
        }

        const existing = reviews.get(parsed.data.actionId);
        if (!existing) {
          return Response.json({ error: "Action not found" }, { status: 404 });
        }

        if (parsed.data.decision === "rejected") {
          const updated = {
            ...existing,
            decisions: existing.decisions.map((d) =>
              d.gate === parsed.data.gate
                ? { ...d, status: "rejected" as const, decidedAt: Date.now(), decidedBy: auth.userId, reason: parsed.data.reason }
                : d,
            ),
            canExecute: false,
          };
          reviews.set(parsed.data.actionId, updated);

          traceLog.append({
            actionId: parsed.data.actionId,
            event: "gate_rejected",
            gate: parsed.data.gate,
            actor: auth.userId,
            reason: parsed.data.reason,
          });

          return Response.json({ review: updated });
        }

        const updated = approveGate(existing, parsed.data.gate as GateName, auth.userId, parsed.data.reason);
        reviews.set(parsed.data.actionId, updated);

        traceLog.append({
          actionId: parsed.data.actionId,
          event: "gate_approved",
          gate: parsed.data.gate,
          actor: auth.userId,
          reason: parsed.data.reason,
        });

        return Response.json({ review: updated });
      },
    },
  },
});

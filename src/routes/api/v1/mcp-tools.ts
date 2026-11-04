import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authorizeActivityRequest } from "@/lib/activity/api-auth.server";
import { REMIND_ME_TOOLS } from "@/lib/mcp/tools";
import { serverMemory } from "@/lib/memory/server";
import { ingest } from "@/lib/ingestion/pipeline";
import { buildT24hBriefing } from "@/lib/briefings/t24h";
import { createProposedAction, checkGates, approveGate, type GateName } from "@/lib/gates/types";
import { traceLog } from "@/lib/gates/trace";
import type { IngestionInput } from "@/lib/ingestion/schemas";

const reviews = new Map<string, ReturnType<typeof checkGates>>();

const callSchema = z.object({
  tool: z.string(),
  arguments: z.record(z.unknown()).default({}),
});

export const Route = createFileRoute("/api/v1/mcp-tools")({
  server: {
    handlers: {
      // List available tools (MCP tools/list style)
      GET: async ({ request }) => {
        const auth = await authorizeActivityRequest(request);
        if ("response" in auth) return auth.response;
        return Response.json({ tools: REMIND_ME_TOOLS });
      },

      // Call a tool
      POST: async ({ request }) => {
        const auth = await authorizeActivityRequest(request);
        if ("response" in auth) return auth.response;

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = callSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: parsed.error.flatten() }, { status: 400 });
        }

        const { tool, arguments: args } = parsed.data;

        try {
          switch (tool) {
            case "remindme_recall": {
              const limit = typeof args.limit === "number" ? args.limit : 15;
              const records = await serverMemory.retrieveForPrompt(auth.userId, String(args.query ?? ""), limit);
              return Response.json({ ok: true, result: { records } });
            }

            case "remindme_ingest": {
              const kind = args.kind as string;
              const payload = (args.payload as Record<string, unknown>) ?? {};
              const input = { kind, ...payload } as IngestionInput;
              const result = await ingest(auth.userId, input);
              return Response.json({ ok: true, result: { id: result.id, kind: result.kind } });
            }

            case "remindme_briefing_t24h": {
              const records = await serverMemory.retrieveForPrompt(auth.userId, "", 40);
              const briefing = buildT24hBriefing(auth.userId, records);
              return Response.json({ ok: true, result: briefing });
            }

            case "remindme_propose_action": {
              const action = createProposedAction({
                intent: String(args.intent),
                target: String(args.target),
                payload: {},
                rail: args.rail as string | undefined,
                createdBy: auth.userId,
              });
              const review = checkGates(action);
              reviews.set(action.id, review);
              traceLog.append({
                actionId: action.id,
                event: "proposed",
                actor: auth.userId,
                snapshot: { intent: action.intent, target: action.target },
              });
              return Response.json({ ok: true, result: { review } });
            }

            case "remindme_review_gate": {
              const actionId = String(args.actionId);
              const existing = reviews.get(actionId);
              if (!existing) return Response.json({ error: "Action not found" }, { status: 404 });

              const gate = args.gate as GateName;
              const decision = args.decision as string;

              if (decision === "rejected") {
                const updated = {
                  ...existing,
                  decisions: existing.decisions.map((d) =>
                    d.gate === gate
                      ? { ...d, status: "rejected" as const, decidedAt: Date.now(), decidedBy: auth.userId, reason: args.reason as string }
                      : d,
                  ),
                  canExecute: false,
                };
                reviews.set(actionId, updated);
                traceLog.append({ actionId, event: "gate_rejected", gate, actor: auth.userId, reason: args.reason as string });
                return Response.json({ ok: true, result: { review: updated } });
              }

              const updated = approveGate(existing, gate, auth.userId, args.reason as string);
              reviews.set(actionId, updated);
              traceLog.append({ actionId, event: "gate_approved", gate, actor: auth.userId, reason: args.reason as string });
              return Response.json({ ok: true, result: { review: updated } });
            }

            default:
              return Response.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
          }
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "Tool failed" }, { status: 500 });
        }
      },
    },
  },
});

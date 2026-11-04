/**
 * Extension helpers for the existing MCP server at /api/v1/mcp.
 * Import these into the main route when ready to surface the new tools.
 */

import { REMIND_ME_TOOLS, type McpToolDef } from "./tools";
import { serverMemory } from "@/lib/memory/server";
import { ingest } from "@/lib/ingestion/pipeline";
import { buildT24hBriefing } from "@/lib/briefings/t24h";
import { createProposedAction, checkGates, approveGate, type GateName } from "@/lib/gates/types";
import { traceLog } from "@/lib/gates/trace";
import type { IngestionInput } from "@/lib/ingestion/schemas";

const reviews = new Map<string, ReturnType<typeof checkGates>>();

export function getExtendedTools(): McpToolDef[] {
  return REMIND_ME_TOOLS;
}

export async function callExtendedTool(
  userId: string,
  name: string,
  args: Record<string, unknown>,
) {
  switch (name) {
    case "remindme_recall": {
      const limit = typeof args.limit === "number" ? args.limit : 15;
      const records = await serverMemory.retrieveForPrompt(userId, String(args.query ?? ""), limit);
      return { records };
    }

    case "remindme_ingest": {
      const input = { kind: args.kind, ...(args.payload as object) } as IngestionInput;
      const result = await ingest(userId, input);
      return { id: result.id, kind: result.kind };
    }

    case "remindme_briefing_t24h": {
      const records = await serverMemory.retrieveForPrompt(userId, "", 40);
      return buildT24hBriefing(userId, records);
    }

    case "remindme_propose_action": {
      const action = createProposedAction({
        intent: String(args.intent),
        target: String(args.target),
        payload: {},
        rail: args.rail as string | undefined,
        createdBy: userId,
      });
      const review = checkGates(action);
      reviews.set(action.id, review);
      traceLog.append({
        actionId: action.id,
        event: "proposed",
        actor: userId,
        snapshot: { intent: action.intent, target: action.target },
      });
      return { review };
    }

    case "remindme_review_gate": {
      const actionId = String(args.actionId);
      const existing = reviews.get(actionId);
      if (!existing) throw new Error("Action not found");

      const gate = args.gate as GateName;
      const decision = String(args.decision);

      if (decision === "rejected") {
        const updated = {
          ...existing,
          decisions: existing.decisions.map((d) =>
            d.gate === gate
              ? { ...d, status: "rejected" as const, decidedAt: Date.now(), decidedBy: userId, reason: args.reason as string }
              : d,
          ),
          canExecute: false,
        };
        reviews.set(actionId, updated);
        traceLog.append({ actionId, event: "gate_rejected", gate, actor: userId, reason: args.reason as string });
        return { review: updated };
      }

      const updated = approveGate(existing, gate, userId, args.reason as string);
      reviews.set(actionId, updated);
      traceLog.append({ actionId, event: "gate_approved", gate, actor: userId, reason: args.reason as string });
      return { review: updated };
    }

    default:
      return null; // not handled by extension
  }
}

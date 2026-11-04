/**
 * Extension helpers for the existing MCP server at /api/v1/mcp.
 * Includes knowledge graph tools.
 */

import { REMIND_ME_TOOLS, type McpToolDef } from "./tools";
import { serverMemory } from "@/lib/memory/server";
import { ingest } from "@/lib/ingestion/pipeline";
import { buildT24hBriefing } from "@/lib/briefings/t24h";
import { createProposedAction, checkGates, approveGate, type GateName } from "@/lib/gates/types";
import { traceLog } from "@/lib/gates/trace";
import type { IngestionInput } from "@/lib/ingestion/schemas";
import { knowledgeStore, knowledgeSearch, knowledgeList } from "./knowledge-tools";

const reviews = new Map<string, ReturnType<typeof checkGates>>();

const KNOWLEDGE_TOOLS: McpToolDef[] = [
  {
    name: "remindme_knowledge_store",
    description: "Store a fact, preference, person, or note in the user's knowledge graph.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", minLength: 1, maxLength: 1000 },
        type: { type: "string", enum: ["person", "event", "place", "preference", "fact", "note", "task", "decision", "research", "other"] },
      },
      required: ["text"],
      additionalProperties: false,
    },
  },
  {
    name: "remindme_knowledge_search",
    description: "Search the user's knowledge graph by keyword.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 1, maxLength: 200 },
        limit: { type: "integer", minimum: 1, maximum: 20 },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "remindme_knowledge_list",
    description: "List recent knowledge nodes for the authenticated user.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
];

export function getExtendedTools(): McpToolDef[] {
  return [...REMIND_ME_TOOLS, ...KNOWLEDGE_TOOLS];
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

    case "remindme_knowledge_store": {
      const text = String(args.text ?? "").trim();
      if (!text) throw new Error("text is required");
      const node = knowledgeStore(userId, text, typeof args.type === "string" ? args.type : undefined);
      return { saved: true, node };
    }

    case "remindme_knowledge_search": {
      const query = String(args.query ?? "").trim();
      if (!query) throw new Error("query is required");
      const limit = typeof args.limit === "number" ? args.limit : 10;
      return { query, results: knowledgeSearch(userId, query, limit) };
    }

    case "remindme_knowledge_list": {
      const limit = typeof args.limit === "number" ? args.limit : 20;
      return { results: knowledgeList(userId, limit) };
    }

    default:
      return null;
  }
}

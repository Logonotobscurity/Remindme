/**
 * Re:Mind Me MCP tool definitions.
 *
 * Follows 2026-07-28 best practices:
 * - One job per tool
 * - Clear when-to-use descriptions
 * - Explicit annotations (readOnlyHint / destructiveHint)
 * - Tight input schemas
 */

export interface McpToolDef {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
  };
}

export const REMIND_ME_TOOLS: McpToolDef[] = [
  {
    name: "remindme_recall",
    title: "Recall memory",
    description:
      "Retrieve recent redacted memories for the current user from the dual-layer store. Use when you need context, prior notes, tasks, or signals. Returns a short list of memory records. Prefer this over inventing context.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 40, default: 15, description: "Max records to return" },
        query: { type: "string", description: "Optional keyword filter" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "remindme_ingest",
    title: "Ingest typed item",
    description:
      "Store a new typed memory (note, task, reminder, contact, doc, or signal). Use when the user wants to save something durable. Requires a kind and the matching fields. Writes into dual-layer memory.",
    inputSchema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["note", "task", "reminder", "contact", "doc", "signal"],
          description: "Type of item to store",
        },
        payload: {
          type: "object",
          description: "Fields matching the chosen kind (see ingest schema)",
          additionalProperties: true,
        },
      },
      required: ["kind", "payload"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  {
    name: "remindme_briefing_t24h",
    title: "T-24h briefing",
    description:
      "Generate a structured T-24h deep-dive briefing from the user's recent memory. Use when the user asks for a daily summary, what to prepare, or an overview of open work. Returns sections (tasks, reminders, signals, notes).",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "remindme_propose_action",
    title: "Propose action (Meaning Gate)",
    description:
      "Propose an outbound or state-changing action for human review under the Meaning Gate. Use when an action should be suggested but not executed. Default is L1 Draft Mode. Returns a review object with gate status.",
    inputSchema: {
      type: "object",
      properties: {
        intent: { type: "string", minLength: 1, maxLength: 500, description: "Plain-language description of the intended action" },
        target: { type: "string", minLength: 1, maxLength: 200, description: "What will be affected (e.g. reminder, email, calendar)" },
        rail: { type: "string", description: "Optional outbound channel" },
      },
      required: ["intent", "target"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  {
    name: "remindme_review_gate",
    title: "Review Action Gate",
    description:
      "Approve or reject a specific gate (usually the Meaning Gate) on a previously proposed action. Use only after the user has explicitly confirmed. Updates the review and writes a Trace entry.",
    inputSchema: {
      type: "object",
      properties: {
        actionId: { type: "string", description: "ID returned by propose_action" },
        gate: { type: "string", enum: ["meaning", "scope", "rail", "trace"] },
        decision: { type: "string", enum: ["approved", "rejected"] },
        reason: { type: "string", description: "Optional reason" },
      },
      required: ["actionId", "gate", "decision"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
];

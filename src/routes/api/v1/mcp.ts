import { createServerFileRoute } from "@tanstack/react-start/server";
import { z } from "zod";
import { authenticateMcpToken, type McpSource } from "@/lib/activity/mcp-access.server";
import {
  createActivity,
  listActivities,
  listPendingActions,
  searchActivities,
  upsertDecision,
  upsertMcpActionItem,
} from "@/lib/activity/service";

const SUPPORTED_PROTOCOLS = new Set(["2025-11-25", "2025-06-18", "2025-03-26"]);
const MAX_BODY_BYTES = 64 * 1024;

const captureActivitySchema = z.object({
  title: z.string().trim().min(1).max(240),
  summary: z.string().trim().max(4000).optional(),
  project: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  activityType: z.enum(["research", "engineering", "decision", "idea", "meeting", "note", "reminder", "journal", "sync", "other"]).default("other"),
  sourceReference: z.string().trim().min(1).max(500).optional(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
}).strict();

const captureDecisionSchema = z.object({
  title: z.string().trim().min(1).max(240),
  decision: z.string().trim().min(1).max(4000),
  rationale: z.string().trim().max(4000).optional(),
  project: z.string().trim().max(120).optional(),
  sourceReference: z.string().trim().min(1).max(500).optional(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
}).strict();

const captureActionItemSchema = z.object({
  title: z.string().trim().min(1).max(240),
  summary: z.string().trim().max(4000).optional(),
  project: z.string().trim().max(120).optional(),
  sourceReference: z.string().trim().min(1).max(500).optional(),
  dueAt: z.string().datetime({ offset: true }).optional(),
}).strict();

const searchMemorySchema = z.object({
  query: z.string().trim().min(1).max(200),
  limit: z.number().int().min(1).max(20).optional(),
}).strict();

const dailySummarySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).strict();

type JsonRpcId = string | number;
type JsonRpcMessage = {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
};

function responseHeaders(protocolVersion?: string) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Authorization",
  });
  if (protocolVersion) headers.set("MCP-Protocol-Version", protocolVersion);
  return headers;
}

function rpcResponse(id: JsonRpcId, result: unknown, protocolVersion?: string) {
  return Response.json(
    { jsonrpc: "2.0", id, result },
    { headers: responseHeaders(protocolVersion) },
  );
}

function rpcError(id: JsonRpcId | null, code: number, message: string, status = 200, protocolVersion?: string) {
  return Response.json(
    { jsonrpc: "2.0", id, error: { code, message } },
    { status, headers: responseHeaders(protocolVersion) },
  );
}

function toolResult(value: unknown) {
  const text = JSON.stringify(value, null, 2);
  return { content: [{ type: "text", text }], structuredContent: value };
}

function toolError(message: string) {
  return { isError: true, content: [{ type: "text", text: message }] };
}

const TOOLS = [
  {
    name: "capture_activity",
    description: "Save a concise activity record to the user's private Re:Mind Me memory. Use for meaningful work, research, ideas, completed work, notes, or project updates. The authenticated token determines the source; never put secrets or full unrelated transcripts into the summary. Supply a stable sourceReference when a source event can be retried or imported again.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 1, maxLength: 240 },
        summary: { type: "string", maxLength: 4000 },
        project: { type: "string", maxLength: 120 },
        category: { type: "string", maxLength: 80 },
        activityType: { type: "string", enum: ["research", "engineering", "decision", "idea", "meeting", "note", "reminder", "journal", "sync", "other"] },
        sourceReference: { type: "string", minLength: 1, maxLength: 500, description: "Stable identifier from the source system for deduplication." },
        occurredAt: { type: "string", format: "date-time", description: "Optional ISO 8601 timestamp with timezone offset." },
      },
      required: ["title"],
      additionalProperties: false,
    },
  },
  {
    name: "capture_decision",
    description: "Record a decision and its rationale in the central private activity memory. Decisions are searchable and linked to the source activity; they are not automatically treated as approved external actions.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 1, maxLength: 240 },
        decision: { type: "string", minLength: 1, maxLength: 4000 },
        rationale: { type: "string", maxLength: 4000 },
        project: { type: "string", maxLength: 120 },
        sourceReference: { type: "string", minLength: 1, maxLength: 500 },
        occurredAt: { type: "string", format: "date-time" },
      },
      required: ["title", "decision"],
      additionalProperties: false,
    },
  },
  {
    name: "capture_action_item",
    description: "Save an outstanding task to the user's private action list. A due date is optional and should only be supplied when the user or source explicitly established one. Replays with the same sourceReference update the same task without reopening a completed task.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 1, maxLength: 240 },
        summary: { type: "string", maxLength: 4000 },
        project: { type: "string", maxLength: 120 },
        sourceReference: { type: "string", minLength: 1, maxLength: 500 },
        dueAt: { type: "string", format: "date-time", description: "Optional ISO 8601 timestamp with timezone offset." },
      },
      required: ["title"],
      additionalProperties: false,
    },
  },
  {
    name: "search_memory",
    description: "Search the authenticated user's recent activity records by title, summary, project, or category. Only the token owner's records are returned.",
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
    name: "get_daily_summary",
    description: "Retrieve activity records for one calendar date and pending action items due on that date. Supply the user's local date when known; without a date, the server uses its UTC calendar date. This is a factual digest of captured records, not a claim that every platform was connected.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Calendar date in YYYY-MM-DD form." },
      },
      additionalProperties: false,
    },
  },
];

async function callTool(
  name: string,
  rawArguments: unknown,
  principal: { userId: string; source: McpSource },
) {
  const args = rawArguments && typeof rawArguments === "object" && !Array.isArray(rawArguments)
    ? rawArguments
    : {};

  switch (name) {
    case "capture_activity": {
      const parsed = captureActivitySchema.safeParse(args);
      if (!parsed.success) return toolError("Invalid capture_activity arguments. Check the title, timestamps, and field lengths.");
      const input = parsed.data;
      const id = await createActivity(principal.userId, {
        ...input,
        source: principal.source,
        captureMethod: "mcp",
        privacyLevel: "private",
      });
      return toolResult({ saved: true, activityId: id, source: principal.source, privacy: "private" });
    }
    case "capture_decision": {
      const parsed = captureDecisionSchema.safeParse(args);
      if (!parsed.success) return toolError("Invalid capture_decision arguments. Supply a title and decision.");
      const input = parsed.data;
      const activityId = await createActivity(principal.userId, {
        source: principal.source,
        project: input.project,
        category: "Decision",
        title: input.title,
        summary: [input.decision, input.rationale ? "Rationale: " + input.rationale : ""].filter(Boolean).join("\n\n"),
        activityType: "decision",
        sourceReference: input.sourceReference,
        occurredAt: input.occurredAt,
        captureMethod: "mcp",
        privacyLevel: "private",
      });
      const decisionId = await upsertDecision(principal.userId, principal.source, {
        activityId,
        project: input.project,
        title: input.title,
        decision: input.decision,
        rationale: input.rationale,
        sourceReference: input.sourceReference,
      });
      return toolResult({ saved: true, activityId, decisionId, source: principal.source, privacy: "private" });
    }
    case "capture_action_item": {
      const parsed = captureActionItemSchema.safeParse(args);
      if (!parsed.success) return toolError("Invalid capture_action_item arguments. Check the title and optional dueAt timestamp.");
      const input = parsed.data;
      const action = await upsertMcpActionItem(principal.userId, principal.source, {
        title: input.title,
        summary: input.summary,
        project: input.project,
        sourceReference: input.sourceReference,
        dueAt: input.dueAt ? new Date(input.dueAt).toISOString() : undefined,
      });
      return toolResult({ saved: true, actionItem: action, source: principal.source, privacy: "private" });
    }
    case "search_memory": {
      const parsed = searchMemorySchema.safeParse(args);
      if (!parsed.success) return toolError("Invalid search_memory arguments. Supply a query and optional limit from 1 to 20.");
      const results = await searchActivities(principal.userId, parsed.data);
      return toolResult({ query: parsed.data.query, count: results.length, results });
    }
    case "get_daily_summary": {
      const parsed = dailySummarySchema.safeParse(args);
      if (!parsed.success) return toolError("Invalid date. Use a real calendar date in YYYY-MM-DD form.");
      const date = parsed.data.date ?? new Date().toISOString().slice(0, 10);
      const dateCheck = new Date(date + "T00:00:00.000Z");
      if (!Number.isFinite(dateCheck.getTime()) || dateCheck.toISOString().slice(0, 10) !== date) {
        return toolError("Invalid date. Use a real calendar date in YYYY-MM-DD form.");
      }
      const [activities, pendingActions] = await Promise.all([
        listActivities(principal.userId, { date, limit: 100 }),
        listPendingActions(principal.userId, "pending"),
      ]);
      const dueActions = pendingActions.filter((action) =>
        typeof action.due_at === "string" && action.due_at.slice(0, 10) === date,
      );
      return toolResult({
        date,
        dateBasis: parsed.data.date ? "requested calendar date" : "UTC fallback; pass a local date for timezone accuracy",
        activityCount: activities.length,
        activities,
        pendingActionCount: dueActions.length,
        pendingActionsDue: dueActions,
        coverageNote: "This report contains captured records only. It does not imply that every AI provider or activity source was connected.",
      });
    }
    default:
      return toolError("Unknown tool. Use tools/list to see available Re:Mind Me tools.");
  }
}

export const Route = createServerFileRoute("/api/v1/mcp")({
  GET: async () => new Response("MCP Streamable HTTP accepts POST requests only.", {
    status: 405,
    headers: { Allow: "POST", "Cache-Control": "no-store" },
  }),

  POST: async ({ request }) => {
    const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (contentType !== "application/json") {
      return Response.json({ error: "Content-Type must be application/json." }, {
        status: 415,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const accept = request.headers.get("accept") ?? "*/*";
    if (!accept.includes("application/json") && !accept.includes("*/*")) {
      return Response.json({ error: "Accept must include application/json for this stateless MCP endpoint." }, {
        status: 406,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const protocolHeader = request.headers.get("MCP-Protocol-Version");
    if (protocolHeader && !SUPPORTED_PROTOCOLS.has(protocolHeader)) {
      return Response.json({ error: "Unsupported MCP protocol version." }, {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      });
    }

    let principal: Awaited<ReturnType<typeof authenticateMcpToken>>;
    try {
      principal = await authenticateMcpToken(request);
    } catch (error) {
      console.error("[mcp] Token verification failed", error);
      return Response.json({ error: "MCP authentication is temporarily unavailable." }, {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (!principal) {
      return Response.json({ error: "Unauthorized" }, {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
          "WWW-Authenticate": 'Bearer realm="Re:Mind Me MCP"',
        },
      });
    }

    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_BODY_BYTES) {
      return Response.json({ error: "MCP request exceeds the 64 KB limit." }, {
        status: 413,
        headers: { "Cache-Control": "no-store" },
      });
    }

    let bodyText: string;
    try {
      bodyText = await request.text();
    } catch {
      return Response.json({ error: "Could not read MCP request body." }, {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_BYTES) {
      return Response.json({ error: "MCP request exceeds the 64 KB limit." }, {
        status: 413,
        headers: { "Cache-Control": "no-store" },
      });
    }

    let message: JsonRpcMessage;
    try {
      message = JSON.parse(bodyText) as JsonRpcMessage;
    } catch {
      return rpcError(null, -32700, "Parse error", 400, protocolHeader ?? undefined);
    }

    if (!message || typeof message !== "object" || Array.isArray(message) || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
      return rpcError(null, -32600, "Invalid JSON-RPC request", 400, protocolHeader ?? undefined);
    }

    const hasId = Object.hasOwn(message, "id");
    const id = typeof message.id === "string" || typeof message.id === "number" ? message.id : null;
    const params = message.params && typeof message.params === "object" && !Array.isArray(message.params)
      ? message.params as Record<string, unknown>
      : {};
    let negotiated = protocolHeader ?? "2025-11-25";

    if (!hasId || id === null) {
      // MCP notifications have no JSON-RPC id and receive no JSON-RPC response.
      if (message.method.startsWith("notifications/")) {
        return new Response(null, { status: 202, headers: { "Cache-Control": "no-store" } });
      }
      return rpcError(null, -32600, "Requests must include a string or numeric id", 400, negotiated);
    }

    if (message.method === "initialize") {
      const requested = typeof params.protocolVersion === "string" ? params.protocolVersion : "";
      negotiated = SUPPORTED_PROTOCOLS.has(requested) ? requested : "2025-11-25";
      return rpcResponse(id, {
        protocolVersion: negotiated,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "remindme-activity-memory", version: "1.0.0" },
        instructions: "Use explicit tool calls to save concise, user-authorized work summaries. The bearer token fixes the source identity and all records are scoped to the token owner. Never infer completion from discussion, create deadlines that were not stated, or claim complete coverage of disconnected sources.",
      }, negotiated);
    }

    if (message.method === "ping") return rpcResponse(id, {}, negotiated);

    if (message.method === "tools/list") {
      return rpcResponse(id, { tools: TOOLS }, negotiated);
    }

    if (message.method === "tools/call") {
      const name = typeof params.name === "string" ? params.name : "";
      try {
        const result = await callTool(name, params.arguments, {
          userId: principal.userId,
          source: principal.source,
        });
        return rpcResponse(id, result, negotiated);
      } catch (error) {
        console.error("[mcp] Tool call failed", { tool: name, error });
        return rpcResponse(id, toolError("The requested operation failed. Check the input and try again; no credentials are returned by this service."), negotiated);
      }
    }

    return rpcError(id, -32601, "Method not found", 200, negotiated);
  },
});

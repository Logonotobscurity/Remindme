/**
 * Lightweight integration checks for /api/v1/mcp
 * Run with: npx tsx src/routes/api/v1/mcp.integration.test.ts
 * (Requires a valid MCP token in MCP_TEST_TOKEN and a running server, or call the handlers directly.)
 */

import { REMIND_ME_TOOLS } from "@/lib/mcp/tools";

const EXPECTED_NEW_TOOLS = [
  "remindme_recall",
  "remindme_ingest",
  "remindme_briefing_t24h",
  "remindme_propose_action",
  "remindme_review_gate",
];

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

export async function runMcpIntegrationChecks() {
  // 1. Tool catalog contains the new tools
  const names = REMIND_ME_TOOLS.map((t) => t.name);
  for (const expected of EXPECTED_NEW_TOOLS) {
    assert(names.includes(expected), `Missing tool in catalog: ${expected}`);
  }
  console.log("[mcp-test] catalog OK —", EXPECTED_NEW_TOOLS.length, "extended tools present");

  // 2. Each tool has a description and inputSchema
  for (const tool of REMIND_ME_TOOLS) {
    assert(tool.description && tool.description.length > 20, `Weak description on ${tool.name}`);
    assert(tool.inputSchema && tool.inputSchema.type === "object", `Missing inputSchema on ${tool.name}`);
    assert(tool.annotations, `Missing annotations on ${tool.name}`);
  }
  console.log("[mcp-test] schema + annotations OK");

  // 3. recall is marked read-only
  const recall = REMIND_ME_TOOLS.find((t) => t.name === "remindme_recall");
  assert(recall?.annotations?.readOnlyHint === true, "remindme_recall should be read-only");
  console.log("[mcp-test] annotations OK");

  return { ok: true, tools: names };
}

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runMcpIntegrationChecks()
    .then((r) => {
      console.log("[mcp-test] all checks passed", r);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[mcp-test] failed", err);
      process.exit(1);
    });
}

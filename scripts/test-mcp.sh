#!/usr/bin/env bash
# Smoke test for /api/v1/mcp
# Usage: MCP_TEST_TOKEN=... ./scripts/test-mcp.sh
# Optional override: BASE_URL=https://other.example.com ./scripts/test-mcp.sh

set -euo pipefail

: "${MCP_TEST_TOKEN:?MCP_TEST_TOKEN is required}"
BASE_URL="${BASE_URL:-https://remindme-tau.vercel.app}"

ENDPOINT="${BASE_URL}/api/v1/mcp"

echo "=== tools/list (${BASE_URL}) ==="
curl -sS -X POST "$ENDPOINT" \
  -H "Authorization: Bearer ${MCP_TEST_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "MCP-Protocol-Version: 2026-07-28" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq .

echo ""
echo "=== tools/call remindme_recall ==="
curl -sS -X POST "$ENDPOINT" \
  -H "Authorization: Bearer ${MCP_TEST_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "MCP-Protocol-Version: 2026-07-28" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"remindme_recall","arguments":{"limit":5}}}' | jq .

echo ""
echo "Done."

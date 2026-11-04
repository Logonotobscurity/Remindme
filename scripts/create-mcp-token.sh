#!/usr/bin/env bash
# Create a personal MCP token for the currently authenticated user.
# Best practice: use only for non-interactive clients; prefer OAuth for people.
#
# Usage:
#   SESSION_COOKIE="remindme_session=..." ./scripts/create-mcp-token.sh "CI smoke test"
#
# Optional:
#   BASE_URL=https://remindme-tau.vercel.app SOURCE=manual ./scripts/create-mcp-token.sh "label"

set -euo pipefail

LABEL="${1:-CI token}"
BASE_URL="${BASE_URL:-https://remindme-tau.vercel.app}"
SOURCE="${SOURCE:-manual}"

if [[ -z "${SESSION_COOKIE:-}" ]]; then
  echo "Error: SESSION_COOKIE is required (the app session cookie)." >&2
  echo "Example: SESSION_COOKIE='remindme_session=abc123' $0 \"label\"" >&2
  exit 1
fi

echo "Creating MCP token (source=${SOURCE}, label=${LABEL})..."

RESPONSE=$(curl -sS -X POST "${BASE_URL}/api/v1/mcp-tokens" \
  -H "Content-Type: application/json" \
  -H "Cookie: ${SESSION_COOKIE}" \
  -d "{\"action\":\"create\",\"label\":\"${LABEL}\",\"source\":\"${SOURCE}\"}")

if echo "$RESPONSE" | jq -e '.token' >/dev/null 2>&1; then
  TOKEN=$(echo "$RESPONSE" | jq -r '.token')
  PREFIX=$(echo "$RESPONSE" | jq -r '.tokenPrefix')
  ID=$(echo "$RESPONSE" | jq -r '.id')
  echo ""
  echo "Token created (id=${ID}, prefix=${PREFIX})."
  echo "Save this now — it will not be shown again:"
  echo ""
  echo "  MCP_TEST_TOKEN=${TOKEN}"
  echo ""
  echo "Store it in a vault or OS keychain. Revoke with:"
  echo "  curl -X POST ${BASE_URL}/api/v1/mcp-tokens -H 'Cookie: ${SESSION_COOKIE}' -d '{\"action\":\"revoke\",\"id\":${ID}}'"
else
  echo "Failed to create token:" >&2
  echo "$RESPONSE" | jq . >&2 || echo "$RESPONSE" >&2
  exit 1
fi

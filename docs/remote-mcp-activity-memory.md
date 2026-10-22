# Remote MCP activity memory

Re:Mind Me exposes a stateless Streamable HTTP MCP endpoint at `/api/v1/mcp`.

This connector lets an AI client explicitly save concise activity records, decisions, and action items to the authenticated user's private activity database, and search that saved memory later. It does **not** silently read a provider's private conversation history or run an always-on background sync.

## Connect a client

1. Sign in to Re:Mind Me and open **Settings → AI memory connections**.
2. Create a token for the client you are connecting. Choose the matching source (Claude, ChatGPT, Grok, or LOG_ON); the source recorded in activity is bound to that token, not selected by a tool call.
3. Copy the secret when it is first displayed. Re:Mind Me stores only a SHA-256 digest; the secret cannot be retrieved later. Create a replacement if it is lost.
4. Configure the MCP client with the full URL shown in Settings and an HTTP `Authorization: Bearer <token>` header.
5. Test with a deliberate tool call such as saving a brief activity, then confirm the record appears in Memory.

Example shape for clients that use a JSON configuration:

```json
{
  "mcpServers": {
    "remindme": {
      "url": "https://YOUR-REMIND-ME-DOMAIN/api/v1/mcp",
      "headers": {
        "Authorization": "Bearer rmm_REPLACE_WITH_YOUR_SECRET"
      }
    }
  }
}
```

Replace the URL and token with the exact values from your deployment and Settings. Do not commit real tokens to a repository, share them in prompts, or place them in screenshots. Revoke any token you suspect has leaked.

## Available tools

- `capture_activity`: save a concise record, project/category metadata, activity type, source reference, and optional occurrence time.
- `capture_decision`: save a decision plus rationale and link it to the private activity feed.
- `capture_action_item`: save an outstanding action. A due date should be supplied only when it was actually established.
- `search_memory`: find activities by title, summary, project, or category.
- `get_daily_summary`: retrieve captured activities for a calendar date and pending actions due on that date.

Tool writes default to private activity storage. Each token is tied to one user and one source label. Repeated writes with the same source reference update the existing decision/action/activity where supported, and completed action items are not reopened by a retried capture.

## Security and coverage

- Tokens grant read/write access to the owner's activity memory. Keep them secret and revoke them from Settings when no longer needed.
- Raw token values are never stored; only a hash is persisted. Token metadata lists the label, source, creation date, and last use.
- Every read/write is scoped to the owner identified by the token. A caller cannot choose another user id in tool arguments.
- The connector records only what the client explicitly sends. Historical exports, live platform APIs, and scheduled daily compilation are separate integration steps.
- The endpoint supports the current stateless MCP protocol `2026-07-28`, including `server/discover`, per-request `_meta`, and validation of `MCP-Protocol-Version`, `Mcp-Method`, and `Mcp-Name` headers. It also retains the legacy `initialize` flow for `2025-11-25`, `2025-06-18`, and `2025-03-26` clients.
- Clients must support configuring a custom Bearer header. This release does not implement an OAuth authorization-server flow, SSE subscriptions, or the older HTTP+SSE transport from `2024-11-05`. Browser-originated requests must be same-origin; server-to-server MCP clients generally omit `Origin`.
- The daily digest uses UTC when no date is supplied. Pass the user's local `YYYY-MM-DD` date when requesting a timezone-accurate report.

The app's existing authenticated REST API remains available for first-party clients. MCP is an additional explicit-capture surface, not a second source of truth.

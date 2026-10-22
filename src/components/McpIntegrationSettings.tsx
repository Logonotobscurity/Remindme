import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { activityApiFetch } from "@/lib/activity/api-client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

type McpSource = "claude" | "chatgpt" | "grok" | "log_on" | "manual";

type McpTokenSummary = {
  id: number;
  label: string;
  source: McpSource;
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
};

type CreatedMcpToken = {
  id: number;
  label: string;
  source: McpSource;
  tokenPrefix: string;
  token: string;
  createdAt: string;
};

const SOURCES: { value: McpSource; label: string }[] = [
  { value: "claude", label: "Claude" },
  { value: "chatgpt", label: "ChatGPT" },
  { value: "grok", label: "Grok" },
  { value: "log_on", label: "LOG_ON" },
  { value: "manual", label: "Other / manual client" },
];

async function errorFrom(response: Response, fallback: string) {
  try {
    const body = await response.json() as { error?: unknown };
    return typeof body.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export function McpIntegrationSettings() {
  const { user, isPending: authPending } = useCurrentUserState();
  const userId = user?.id;
  const [tokens, setTokens] = useState<McpTokenSummary[]>([]);
  const [label, setLabel] = useState("Claude connector");
  const [source, setSource] = useState<McpSource>("claude");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [createdToken, setCreatedToken] = useState<CreatedMcpToken | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState("/api/v1/mcp");

  useEffect(() => {
    setEndpoint(window.location.origin + "/api/v1/mcp");
  }, []);

  const reloadTokens = useCallback(async () => {
    if (!userId || authPending) {
      setTokens([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await activityApiFetch("/api/v1/mcp-tokens");
      if (!response.ok) throw new Error(await errorFrom(response, "Couldn't load MCP tokens."));
      const data = await response.json() as McpTokenSummary[];
      setTokens(Array.isArray(data) ? data : []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't load MCP tokens.");
    } finally {
      setLoading(false);
    }
  }, [authPending, userId]);

  useEffect(() => {
    void reloadTokens();
  }, [reloadTokens]);

  const createToken = async () => {
    if (!label.trim() || busy || !userId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setCreatedToken(null);
    setCopied(false);
    try {
      const response = await activityApiFetch("/api/v1/mcp-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", label: label.trim(), source }),
      });
      if (!response.ok) throw new Error(await errorFrom(response, "Couldn't create the token."));
      const created = await response.json() as CreatedMcpToken;
      if (!created.token || !created.id) throw new Error("The server did not return a valid new token.");
      setCreatedToken(created);
      setNotice("Token created. Copy it now; the secret won't be shown again.");
      setLabel("");
      await reloadTokens();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't create the token.");
    } finally {
      setBusy(false);
    }
  };

  const revokeToken = async (token: McpTokenSummary) => {
    if (busy || !window.confirm("Revoke this " + token.source + " token? Connected clients will stop working immediately.")) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await activityApiFetch("/api/v1/mcp-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", id: token.id }),
      });
      if (!response.ok) throw new Error(await errorFrom(response, "Couldn't revoke the token."));
      if (createdToken?.id === token.id) setCreatedToken(null);
      setNotice("Token revoked.");
      await reloadTokens();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't revoke the token.");
    } finally {
      setBusy(false);
    }
  };

  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setNotice("Copied to clipboard.");
    } catch {
      setError("Clipboard access is blocked. Select and copy the token manually.");
    }
  };

  if (authPending) {
    return <section className="mt-6 rounded-2xl border border-line p-4 text-sm text-mute">Checking account access…</section>;
  }

  if (!userId) {
    return (
      <section className="mt-6 rounded-2xl border border-line bg-white p-4">
        <div className="flex items-center gap-2 font-semibold"><ShieldCheck size={18} /> AI memory connections</div>
        <p className="mt-2 text-sm leading-relaxed text-mute">Sign in to create or revoke connector tokens. Guest-only reminders cannot be exposed to external AI clients.</p>
      </section>
    );
  }

  return (
    <section className="mt-6 space-y-4 rounded-2xl border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand"><ShieldCheck size={20} /></span>
        <div>
          <h3 className="font-semibold">AI memory connections</h3>
          <p className="mt-1 text-sm leading-relaxed text-mute">Connect an MCP-compatible AI client to save activities, decisions, and action items or search your private memory.</p>
        </div>
      </div>

      <div className="rounded-xl bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-mute">MCP endpoint</p>
        <p className="mt-1 break-all font-mono text-xs">{endpoint}</p>
        <button type="button" onClick={() => void copyValue(endpoint)} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-brand">
          {copied ? <Check size={14} /> : <Copy size={14} />} Copy endpoint
        </button>
      </div>

      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void createToken(); }}>
        <label className="block text-xs font-medium text-mute">
          Connector name
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            maxLength={80}
            required
            placeholder="Claude — work memory"
            className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink"
          />
        </label>
        <label className="block text-xs font-medium text-mute">
          Source attribution
          <select value={source} onChange={(event) => setSource(event.target.value as McpSource)} className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink">
            {SOURCES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <button type="submit" disabled={busy || !label.trim()} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
          <Plus size={16} /> {busy ? "Working…" : "Create connector token"}
        </button>
      </form>

      {createdToken && (
        <div className="rounded-xl border border-brand/40 bg-brand/5 p-3">
          <p className="text-sm font-semibold">Copy your new token now</p>
          <p className="mt-1 text-xs leading-relaxed text-mute">This secret is only displayed once. Anyone holding it can read and write your private activity memory. Store it in your connector's secure credentials field, never in a prompt or repository.</p>
          <code className="mt-3 block max-h-24 overflow-y-auto break-all rounded-lg bg-white p-3 text-xs">{createdToken.token}</code>
          <button type="button" onClick={() => void copyValue(createdToken.token)} className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand px-3 text-sm font-semibold text-white">
            {copied ? <Check size={15} /> : <Copy size={15} />} Copy secret token
          </button>
        </div>
      )}

      {notice && <p role="status" className="text-sm text-moss">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-blush/10 p-3 text-sm text-blush">{error}</p>}

      <div className="border-t border-line pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold">Active tokens</h4>
          <button type="button" onClick={() => void reloadTokens()} disabled={loading || busy} className="text-xs font-semibold text-brand disabled:opacity-50">{loading ? "Refreshing…" : "Refresh"}</button>
        </div>
        {tokens.length === 0 ? (
          <p className="text-sm text-mute">{loading ? "Loading tokens…" : "No active connector tokens yet."}</p>
        ) : (
          <div className="space-y-2">
            {tokens.map((token) => (
              <div key={token.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold">{token.label}</p>
                  <p className="mt-0.5 text-xs text-mute">{SOURCES.find((item) => item.value === token.source)?.label ?? token.source} · {token.token_prefix}…</p>
                  <p className="mt-1 text-xs text-mute">Created {new Date(token.created_at).toLocaleDateString()} · {token.last_used_at ? "Last used " + new Date(token.last_used_at).toLocaleString() : "Not used yet"}</p>
                </div>
                <button type="button" aria-label={"Revoke " + token.label} title="Revoke token" disabled={busy} onClick={() => void revokeToken(token)} className="flex size-9 shrink-0 items-center justify-center rounded-lg text-blush hover:bg-blush/10 disabled:opacity-50">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

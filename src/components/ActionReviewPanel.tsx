import { useState } from "react";
import { Check, X, ShieldCheck, AlertCircle } from "lucide-react";
import { activityApiFetch } from "@/lib/activity/api-client";

type GateDecision = {
  gate: "meaning" | "scope" | "rail" | "trace";
  status: "pending" | "approved" | "rejected" | "blocked";
  reason?: string;
};

type ActionReview = {
  action: {
    id: string;
    intent: string;
    target: string;
    scope: string;
  };
  decisions: GateDecision[];
  canExecute: boolean;
};

export function ActionReviewPanel() {
  const [intent, setIntent] = useState("");
  const [target, setTarget] = useState("");
  const [review, setReview] = useState<ActionReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function propose() {
    if (!intent.trim() || !target.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await activityApiFetch("/api/v1/gates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: intent.trim(), target: target.trim(), payload: {} }),
      });
      if (!res.ok) throw new Error("Could not propose action");
      const data = await res.json();
      setReview(data.review);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function decide(gate: GateDecision["gate"], decision: "approved" | "rejected") {
    if (!review) return;
    setBusy(true);
    try {
      const res = await activityApiFetch("/api/v1/gates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionId: review.action.id,
          gate,
          decision,
          reason: decision === "approved" ? "User approved Meaning Gate" : "User rejected",
        }),
      });
      if (!res.ok) throw new Error("Update failed");
      const data = await res.json();
      setReview(data.review);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const meaning = review?.decisions.find((d) => d.gate === "meaning");

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-violet-600" />
        <h2 className="text-lg font-bold">Action Review (Meaning Gate)</h2>
      </div>

      {!review ? (
        <div className="space-y-3">
          <input
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="What do you intend to do? (plain language)"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
          />
          <input
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Target (e.g. reminder, email, calendar)"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <button
            type="button"
            onClick={propose}
            disabled={busy || !intent.trim() || !target.trim()}
            className="rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Proposing…" : "Propose Action"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl bg-slate-50 p-3 text-sm">
            <p className="font-medium">{review.action.intent}</p>
            <p className="mt-1 text-slate-500">Target: {review.action.target}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-slate-400">
              Scope: {review.action.scope} • Can execute: {review.canExecute ? "Yes" : "No (L1 Draft)"}
            </p>
          </div>

          {meaning && meaning.status === "pending" && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => decide("meaning", "approved")}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-emerald-600 py-2 text-sm font-semibold text-white"
              >
                <Check className="h-4 w-4" /> Approve Meaning
              </button>
              <button
                type="button"
                onClick={() => decide("meaning", "rejected")}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-rose-600 py-2 text-sm font-semibold text-white"
              >
                <X className="h-4 w-4" /> Reject
              </button>
            </div>
          )}

          {meaning && meaning.status !== "pending" && (
            <div className="flex items-center gap-2 text-sm">
              {meaning.status === "approved" ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600" />
              )}
              Meaning Gate: {meaning.status}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setReview(null);
              setIntent("");
              setTarget("");
            }}
            className="text-xs text-slate-500 underline"
          >
            Propose another
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </section>
  );
}

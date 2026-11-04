/**
 * Action Gates for Re:Mind Me
 *
 * Every outbound or state-changing action must pass these four gates
 * before execution. Default posture is L1 Draft Mode.
 */

export type GateName = "meaning" | "scope" | "rail" | "trace";

export type GateStatus = "pending" | "approved" | "rejected" | "blocked";

export interface ProposedAction {
  id: string;
  intent: string;               // plain-language description (Meaning Gate)
  target: string;               // what will be affected
  payload: Record<string, unknown>;
  scope: "read" | "draft" | "execute";
  rail?: string;                // allowed outbound channel
  createdAt: number;
  createdBy: string;
}

export interface GateDecision {
  gate: GateName;
  status: GateStatus;
  reason?: string;
  decidedAt?: number;
  decidedBy?: string;
}

export interface ActionReview {
  action: ProposedAction;
  decisions: GateDecision[];
  canExecute: boolean;          // true only when all four gates are approved
}

/** Default L1 behavior: everything starts as draft and requires explicit approval. */
export function createProposedAction(
  input: Omit<ProposedAction, "id" | "createdAt" | "scope"> & { scope?: ProposedAction["scope"] },
): ProposedAction {
  return {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    scope: input.scope ?? "draft",
    ...input,
  };
}

export function checkGates(action: ProposedAction, decisions: GateDecision[] = []): ActionReview {
  const byGate = new Map(decisions.map((d) => [d.gate, d]));

  const required: GateName[] = ["meaning", "scope", "rail", "trace"];
  const all: GateDecision[] = required.map((gate) => {
    const existing = byGate.get(gate);
    if (existing) return existing;

    // Default: Scope Gate forces draft mode
    if (gate === "scope") {
      return {
        gate,
        status: action.scope === "execute" ? "pending" : "approved",
        reason: action.scope === "execute" ? "Requires explicit approval to leave L1 draft mode" : "L1 draft mode — no execution",
      };
    }

    return {
      gate,
      status: "pending",
      reason: "Awaiting review",
    };
  });

  const canExecute =
    action.scope === "execute" &&
    all.every((d) => d.status === "approved");

  return { action, decisions: all, canExecute };
}

/** Helper to mark a gate approved (used by Meaning Gate UI). */
export function approveGate(
  review: ActionReview,
  gate: GateName,
  decidedBy: string,
  reason?: string,
): ActionReview {
  const decisions = review.decisions.map((d) =>
    d.gate === gate
      ? { ...d, status: "approved" as const, decidedAt: Date.now(), decidedBy, reason }
      : d,
  );
  return checkGates(review.action, decisions);
}

/**
 * Trace Gate — immutable audit log for Action Gates.
 *
 * Every propose, approve, and reject is appended here.
 * In-memory store for now; replace with Postgres append-only table later.
 */

export interface TraceEntry {
  id: string;
  actionId: string;
  event: "proposed" | "gate_approved" | "gate_rejected" | "executed";
  gate?: string;
  actor: string;
  reason?: string;
  timestamp: number;
  snapshot?: Record<string, unknown>;
}

const traces = new Map<string, TraceEntry[]>();

export const traceLog = {
  append(entry: Omit<TraceEntry, "id" | "timestamp"> & { timestamp?: number }) {
    const full: TraceEntry = {
      id: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: entry.timestamp ?? Date.now(),
      ...entry,
    };
    const list = traces.get(entry.actionId) ?? [];
    traces.set(entry.actionId, [...list, full]);
    return full;
  },

  forAction(actionId: string): TraceEntry[] {
    return traces.get(actionId) ?? [];
  },

  recent(limit = 50): TraceEntry[] {
    const all: TraceEntry[] = [];
    for (const list of traces.values()) all.push(...list);
    return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  },
};

/**
 * T-24h Deep-Dive Briefing prototype.
 *
 * Reads recent dual-layer memory and groups it into a structured briefing.
 * No LLM call in this version — pure deterministic summary.
 */

import type { MemoryRecord } from "@/lib/memory/dual-layer";

export interface BriefingSection {
  title: string;
  items: { id: string; content: string; meta?: string }[];
}

export interface T24hBriefing {
  generatedAt: string;
  scope: string;
  horizon: "T-24h";
  summary: string;
  sections: BriefingSection[];
}

export function buildT24hBriefing(scope: string, records: MemoryRecord[]): T24hBriefing {
  const tasks = records.filter((r) => r.metadata?.type === "activity" && (r.metadata as any).category === "task");
  const reminders = records.filter((r) => (r.metadata as any)?.category === "reminder" || r.content.toLowerCase().includes("remind"));
  const signals = records.filter((r) => (r.metadata as any)?.category === "signal");
  const notes = records.filter(
    (r) =>
      !tasks.includes(r) &&
      !reminders.includes(r) &&
      !signals.includes(r),
  );

  const sections: BriefingSection[] = [];

  if (tasks.length) {
    sections.push({
      title: "Open tasks",
      items: tasks.slice(0, 8).map((r) => ({
        id: r.id,
        content: r.content.split("\n")[0],
        meta: (r.metadata as any)?.priority ?? "medium",
      })),
    });
  }

  if (reminders.length) {
    sections.push({
      title: "Upcoming reminders",
      items: reminders.slice(0, 6).map((r) => ({
        id: r.id,
        content: r.content,
        meta: (r.metadata as any)?.dueAt,
      })),
    });
  }

  if (signals.length) {
    sections.push({
      title: "Signals",
      items: signals.slice(0, 5).map((r) => ({
        id: r.id,
        content: r.content,
        meta: (r.metadata as any)?.severity ?? "info",
      })),
    });
  }

  if (notes.length) {
    sections.push({
      title: "Recent notes & activity",
      items: notes.slice(0, 8).map((r) => ({
        id: r.id,
        content: r.content.split("\n")[0],
      })),
    });
  }

  const summary =
    sections.length === 0
      ? "No recent memory to brief on."
      : `Prepared from ${records.length} recent memory items across ${sections.length} sections.`;

  return {
    generatedAt: new Date().toISOString(),
    scope,
    horizon: "T-24h",
    summary,
    sections,
  };
}

/**
 * Daily Recap generation for the Omi shell.
 * Built from conversations and memories captured on a given day.
 */
import type { Conversation } from "./conversation";
import type { Memory } from "./memory";

export type DailyRecap = {
  dateLabel: string;
  dateKey: string;
  title: string;
  body: string;
  conversationCount: number;
  actionCount: number;
  memoryCount: number;
};

function dateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateLabel(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function generateRecapForDay(
  conversations: Conversation[],
  memories: Memory[],
  day: Date = new Date(),
): DailyRecap | null {
  const key = dateKey(day.getTime());
  const convos = conversations.filter((c) => dateKey(c.created) === key);
  const mems = memories.filter((m) => dateKey(m.created) === key);
  if (convos.length === 0 && mems.length === 0) return null;

  const actions = convos.flatMap((c) => c.actionItems.filter((a) => !a.done));
  const highlights = convos.map((c) => c.summary).filter(Boolean).slice(0, 3);
  const openActions = actions.slice(0, 4).map((a) => a.text);
  const facts = mems.slice(0, 3).map((m) => m.text);

  const parts: string[] = [];
  if (highlights.length) parts.push("Highlights: " + highlights.join(" · "));
  if (openActions.length) parts.push("Open: " + openActions.join(" · "));
  if (facts.length) parts.push("Noted: " + facts.join(" · "));

  return {
    dateKey: key,
    dateLabel: dateLabel(day.getTime()),
    title: convos.length === 1 ? convos[0].title : `${convos.length} conversations`,
    body: parts.join("\n") || "Quiet day.",
    conversationCount: convos.length,
    actionCount: actions.length,
    memoryCount: mems.length,
  };
}

export function generateRecentRecaps(
  conversations: Conversation[],
  memories: Memory[],
  days = 7,
): DailyRecap[] {
  const out: DailyRecap[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const recap = generateRecapForDay(conversations, memories, d);
    if (recap) out.push(recap);
  }
  return out;
}

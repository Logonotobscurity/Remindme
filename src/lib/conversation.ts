/**
 * Conversation model for the Omi shell.
 * A conversation holds a transcript, a short summary, and extracted action items.
 * Local-first; scoped the same way as reminders.
 */

export type ActionItem = {
  id: string;
  text: string;
  done: boolean;
  dueAt?: number;
};

export type Conversation = {
  id: string;
  title: string;
  transcript: string;
  summary: string;
  actionItems: ActionItem[];
  created: number;
  updated: number;
  starred?: boolean;
};

const KEY = "remindme.conversations";

function keyFor(scope = "guest") {
  return scope === "guest" ? KEY : KEY + "." + encodeURIComponent(scope);
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadConversations(scope = "guest"): Conversation[] {
  return read<Conversation[]>(keyFor(scope), []);
}

export function persistConversations(items: Conversation[], scope = "guest") {
  write(keyFor(scope), items);
}

export function createConversation(
  input: { title?: string; transcript: string; summary?: string; actionItems?: ActionItem[] },
  scope = "guest",
): Conversation {
  const now = Date.now();
  const item: Conversation = {
    id: now.toString(36),
    title: input.title?.trim() || "Conversation",
    transcript: input.transcript.trim(),
    summary: input.summary?.trim() || summarize(input.transcript),
    actionItems: input.actionItems ?? extractActions(input.transcript),
    created: now,
    updated: now,
  };
  const next = [item, ...loadConversations(scope)];
  persistConversations(next, scope);
  return item;
}

/** Very small local summarizer: first sentence or first 140 chars. */
export function summarize(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const sentence = clean.split(/[.!?]\s/)[0];
  return (sentence.length > 140 ? sentence.slice(0, 137) + "…" : sentence);
}

/** Extract simple action-like phrases. */
export function extractActions(text: string): ActionItem[] {
  const lines = text.split(/[.!?]\s|\n/).map((s) => s.trim()).filter(Boolean);
  const patterns = [/\b(i(?:'| wi)ll|i need to|remind me to|todo|task|follow up|send |email |call )\b/i];
  return lines
    .filter((line) => patterns.some((p) => p.test(line)))
    .slice(0, 8)
    .map((line) => ({
      id: Math.random().toString(36).slice(2, 10),
      text: line.replace(/^\s*(please\s+)?/i, "").trim(),
      done: false,
    }));
}

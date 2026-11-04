/**
 * Durable memories for the Omi shell.
 * Facts that persist beyond a single conversation.
 */

export type Memory = {
  id: string;
  text: string;
  sourceConversationId?: string;
  created: number;
  updated: number;
};

const KEY = "remindme.memories";

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

export function loadMemories(scope = "guest"): Memory[] {
  return read<Memory[]>(keyFor(scope), []);
}

export function persistMemories(items: Memory[], scope = "guest") {
  write(keyFor(scope), items);
}

export function addMemory(text: string, scope = "guest", sourceConversationId?: string): Memory {
  const now = Date.now();
  const item: Memory = {
    id: now.toString(36),
    text: text.trim(),
    sourceConversationId,
    created: now,
    updated: now,
  };
  const next = [item, ...loadMemories(scope)];
  persistMemories(next, scope);
  return item;
}

export function removeMemory(id: string, scope = "guest") {
  const next = loadMemories(scope).filter((m) => m.id !== id);
  persistMemories(next, scope);
  return next;
}

/** Pull simple fact-like sentences from a transcript. */
export function extractMemories(transcript: string): string[] {
  const lines = transcript.split(/[.!?]\s|\n/).map((s) => s.trim()).filter(Boolean);
  const patterns = [/\b(i am|i'm|my |we are|our |prefers?|likes?|lives in|works at|name is)\b/i];
  return lines.filter((line) => patterns.some((p) => p.test(line))).slice(0, 6);
}

/**
 * Conversation model for the Omi shell.
 * Uses stronger local extractors for summary and action items.
 */
import { extractActions as extractActionTexts, summarize as betterSummarize } from "./extract";

export type ActionItem = {
  id: string;
  text: string;
  done: boolean;
  dueAt?: number;
  dueHint?: string;
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
  const extracted = extractActionTexts(input.transcript).map((a) => ({
    id: Math.random().toString(36).slice(2, 10),
    text: a.text,
    done: false,
    dueHint: a.dueHint,
  }));
  const item: Conversation = {
    id: now.toString(36),
    title: input.title?.trim() || "Conversation",
    transcript: input.transcript.trim(),
    summary: input.summary?.trim() || betterSummarize(input.transcript),
    actionItems: input.actionItems ?? extracted,
    created: now,
    updated: now,
  };
  const next = [item, ...loadConversations(scope)];
  persistConversations(next, scope);
  return item;
}

export { betterSummarize as summarize };
export { extractActionTexts as extractActions };

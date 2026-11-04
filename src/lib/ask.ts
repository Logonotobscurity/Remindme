/**
 * Local grounded Ask helper.
 * Answers from conversations and memories using keyword overlap.
 * No external API required.
 */
import type { Conversation } from "./conversation";
import type { Memory } from "./memory";

export type AskSource = {
  type: "conversation" | "memory";
  id: string;
  snippet: string;
};

export type AskResult = {
  answer: string;
  sources: AskSource[];
};

function tokens(s: string): string[] {
  return s.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
}

function score(query: string, text: string): number {
  const q = new Set(tokens(query));
  const t = tokens(text);
  let n = 0;
  for (const w of t) if (q.has(w)) n++;
  return n;
}

export function askLocal(
  question: string,
  conversations: Conversation[],
  memories: Memory[],
): AskResult {
  const q = question.trim();
  if (!q) return { answer: "Ask something about your conversations or memories.", sources: [] };

  const sources: AskSource[] = [];

  const scoredConvos = conversations
    .map((c) => ({ c, s: score(q, c.transcript + " " + c.summary + " " + c.title) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3);

  for (const { c } of scoredConvos) {
    sources.push({ type: "conversation", id: c.id, snippet: c.summary || c.transcript.slice(0, 140) });
  }

  const scoredMems = memories
    .map((m) => ({ m, s: score(q, m.text) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3);

  for (const { m } of scoredMems) {
    sources.push({ type: "memory", id: m.id, snippet: m.text });
  }

  if (sources.length === 0) {
    return {
      answer: "I don't have anything in your conversations or memories that matches that yet.",
      sources: [],
    };
  }

  const lines = sources.map((s) => "• " + s.snippet);
  return {
    answer: "From what you've captured:\n" + lines.join("\n"),
    sources,
  };
}

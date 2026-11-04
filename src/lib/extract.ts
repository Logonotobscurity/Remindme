/**
 * Stronger local extraction for actions and memories.
 * No external API. Heuristic only.
 */

export type ExtractedAction = {
  text: string;
  dueHint?: string;
};

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4 && s.length < 280);
}

const ACTION_PATTERNS: RegExp[] = [
  /\b(i(?:'| wi)ll|i need to|i have to|i should|remind me to|don't forget to|remember to)\b/i,
  /\b(todo|to-do|task|action item|follow[- ]?up|next step)\b/i,
  /\b(send |email |call |text |message |schedule |book |pay |buy |finish |complete |submit |review |update |fix |check )\b/i,
  /\b(we need to|let's |lets |can you |could you |please )\b/i,
];

const DUE_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\btomorrow\b/i, label: "tomorrow" },
  { re: /\btoday\b/i, label: "today" },
  { re: /\bnext week\b/i, label: "next week" },
  { re: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, label: "weekday" },
  { re: /\b(in \d+ (hour|day|minute)s?)\b/i, label: "relative" },
];

export function extractActions(text: string): ExtractedAction[] {
  const sentences = splitSentences(text);
  const seen = new Set<string>();
  const out: ExtractedAction[] = [];

  for (const line of sentences) {
    if (!ACTION_PATTERNS.some((p) => p.test(line))) continue;
    const key = line.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);

    let dueHint: string | undefined;
    for (const d of DUE_PATTERNS) {
      const m = line.match(d.re);
      if (m) {
        dueHint = d.label === "weekday" ? m[0].toLowerCase() : d.label;
        break;
      }
    }

    out.push({
      text: line.replace(/^\s*(please\s+)?/i, "").replace(/[.!?]+$/, "").trim(),
      dueHint,
    });
    if (out.length >= 10) break;
  }
  return out;
}

const MEMORY_PATTERNS: RegExp[] = [
  /\b(i am|i'm|i was|my name is|i live in|i work at|i prefer|i like|i don't like|i hate)\b/i,
  /\b(we are|our |prefers?|likes?|lives in|works at|name is|email is|phone is)\b/i,
  /\b(birthday|anniversary|allergic|always|never|usually)\b/i,
  /\b(my (wife|husband|partner|son|daughter|mom|dad|boss|team))\b/i,
];

export function extractMemories(text: string): string[] {
  const sentences = splitSentences(text);
  const seen = new Set<string>();
  const out: string[] = [];

  for (const line of sentences) {
    if (!MEMORY_PATTERNS.some((p) => p.test(line))) continue;
    const key = line.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line.replace(/[.!?]+$/, "").trim());
    if (out.length >= 8) break;
  }
  return out;
}

/** Better one-line summary: first informative sentence. */
export function summarize(text: string): string {
  const sentences = splitSentences(text);
  const good = sentences.find((s) => s.length > 20) ?? sentences[0] ?? "";
  return good.length > 160 ? good.slice(0, 157) + "…" : good;
}

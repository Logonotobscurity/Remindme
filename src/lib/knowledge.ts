/**
 * Knowledge graph for Re:Mind Me.
 * Supports content types, relationships, hybrid search, and auto-linking.
 */

export type ContentType =
  | "person" | "event" | "place" | "preference" | "fact"
  | "note" | "task" | "decision" | "research" | "other";

export type KnowledgeNode = {
  id: string;
  text: string;
  type: ContentType;
  tags: string[];
  created: number;
  updated: number;
  sourceConversationId?: string;
};

export type KnowledgeEdge = {
  id: string;
  from: string;
  to: string;
  relation: string;
  created: number;
};

const NODE_KEY = "remindme.knowledge.nodes";
const EDGE_KEY = "remindme.knowledge.edges";

function key(base: string, scope = "guest") {
  return scope === "guest" ? base : base + "." + encodeURIComponent(scope);
}

function read<T>(k: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(k: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(k, JSON.stringify(value));
}

export function loadNodes(scope = "guest"): KnowledgeNode[] {
  return read<KnowledgeNode[]>(key(NODE_KEY, scope), []);
}
export function loadEdges(scope = "guest"): KnowledgeEdge[] {
  return read<KnowledgeEdge[]>(key(EDGE_KEY, scope), []);
}
function saveNodes(items: KnowledgeNode[], scope = "guest") {
  write(key(NODE_KEY, scope), items);
}
function saveEdges(items: KnowledgeEdge[], scope = "guest") {
  write(key(EDGE_KEY, scope), items);
}

function tokens(s: string): string[] {
  return s.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
}

function overlap(a: string, b: string): number {
  const sa = new Set(tokens(a));
  const sb = tokens(b);
  let n = 0;
  for (const w of sb) if (sa.has(w)) n++;
  return n;
}

export function storeNode(
  input: { text: string; type?: ContentType; tags?: string[]; sourceConversationId?: string },
  scope = "guest",
): KnowledgeNode {
  const now = Date.now();
  const node: KnowledgeNode = {
    id: now.toString(36),
    text: input.text.trim(),
    type: input.type ?? inferType(input.text),
    tags: input.tags ?? [],
    created: now,
    updated: now,
    sourceConversationId: input.sourceConversationId,
  };
  const existing = loadNodes(scope);
  saveNodes([node, ...existing], scope);

  // Auto-link to top overlapping nodes
  const candidates = existing
    .map((n) => ({ n, s: overlap(node.text, n.text) }))
    .filter((x) => x.s >= 2)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3);
  for (const c of candidates) {
    addEdge(node.id, c.n.id, "related", scope);
  }

  return node;
}

export function addEdge(from: string, to: string, relation: string, scope = "guest"): KnowledgeEdge {
  const edge: KnowledgeEdge = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    from,
    to,
    relation,
    created: Date.now(),
  };
  saveEdges([edge, ...loadEdges(scope)], scope);
  return edge;
}

export function searchNodes(query: string, scope = "guest", limit = 10): KnowledgeNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return loadNodes(scope).slice(0, limit);
  return loadNodes(scope)
    .map((n) => ({
      n,
      s: overlap(q, n.text + " " + n.tags.join(" ") + " " + n.type),
    }))
    .filter((x) => x.s > 0 || x.n.text.toLowerCase().includes(q))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.n);
}

export function relatedNodes(id: string, scope = "guest"): { node: KnowledgeNode; relation: string }[] {
  const edges = loadEdges(scope);
  const nodes = loadNodes(scope);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: { node: KnowledgeNode; relation: string }[] = [];
  for (const e of edges) {
    if (e.from === id && byId.has(e.to)) out.push({ node: byId.get(e.to)!, relation: e.relation });
    if (e.to === id && byId.has(e.from)) out.push({ node: byId.get(e.from)!, relation: e.relation });
  }
  return out;
}

const TYPE_HINTS: { type: ContentType; re: RegExp }[] = [
  { type: "person", re: /\b(my (wife|husband|partner|son|daughter|mom|dad|boss|friend)|name is)\b/i },
  { type: "place", re: /\b(live in|lives in|located|in [A-Z][a-z]+)\b/ },
  { type: "preference", re: /\b(prefer|like|hate|always|never|usually)\b/i },
  { type: "event", re: /\b(meeting|birthday|anniversary|scheduled|tomorrow|next week)\b/i },
  { type: "decision", re: /\b(decided|agreed|will|going to)\b/i },
  { type: "task", re: /\b(need to|remind me|todo|follow up|send |email |call )\b/i },
  { type: "research", re: /\b(research|study|paper|article|learned)\b/i },
];

export function inferType(text: string): ContentType {
  for (const h of TYPE_HINTS) if (h.re.test(text)) return h.type;
  return "fact";
}

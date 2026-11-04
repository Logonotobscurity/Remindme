/**
 * Knowledge graph view for the Omi shell.
 */
import { useMemo, useState } from "react";
import type { KnowledgeNode } from "@/lib/knowledge";
import { relatedNodes, searchNodes, storeNode } from "@/lib/knowledge";

export function KnowledgeView({ scope }: { scope: string }) {
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  const nodes = useMemo(() => searchNodes(q, scope, 50), [q, scope, refresh]);
  const current = open ? nodes.find((n) => n.id === open) : null;
  const related = current ? relatedNodes(current.id, scope) : [];

  const add = () => {
    if (!draft.trim()) return;
    storeNode({ text: draft.trim() }, scope);
    setDraft("");
    setRefresh((n) => n + 1);
  };

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search knowledge…"
          className="flex-1 rounded-lg bg-[#1C1C1E] px-3 py-2 text-[14px] text-white outline-none placeholder:text-[#8E8E93]"
        />
      </div>

      <div className="mb-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a fact, preference, person…"
          className="flex-1 rounded-lg bg-[#1C1C1E] px-3 py-2 text-[14px] text-white outline-none placeholder:text-[#8E8E93]"
        />
        <button type="button" onClick={add} className="rounded-lg bg-white px-3 py-2 text-[13px] font-semibold text-black">
          Add
        </button>
      </div>

      {current ? (
        <div className="rounded-2xl bg-[#1C1C1E] p-4">
          <button type="button" onClick={() => setOpen(null)} className="mb-2 text-[12px] text-[#8E8E93]">← Back</button>
          <div className="mb-1 text-[12px] uppercase tracking-wide text-[#8E8E93]">{current.type}</div>
          <div className="text-[15px] text-white">{current.text}</div>
          {related.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-[12px] text-[#8E8E93]">Related</div>
              {related.map((r) => (
                <button key={r.node.id} type="button" onClick={() => setOpen(r.node.id)} className="block w-full rounded-lg bg-[#2C2C2E] px-3 py-2 text-left text-[13px] text-white">
                  {r.relation}: {r.node.text}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : nodes.length === 0 ? (
        <div className="rounded-2xl bg-[#1C1C1E] px-4 py-5">
          <div className="text-[15px] font-medium text-white">No knowledge yet</div>
          <div className="mt-1 text-[13px] text-[#8E8E93]">Add facts, people, preferences, or events.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {nodes.map((n) => (
            <button key={n.id} type="button" onClick={() => setOpen(n.id)} className="block w-full rounded-2xl bg-[#1C1C1E] p-4 text-left">
              <div className="text-[12px] uppercase tracking-wide text-[#8E8E93]">{n.type}</div>
              <div className="mt-1 text-[14px] text-white">{n.text}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

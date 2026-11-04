/**
 * Memories view for the Omi shell.
 */
import { useState } from "react";
import type { Memory } from "@/lib/memory";

export function MemoriesView({
  items,
  onAdd,
  onRemove,
}: {
  items: Memory[];
  onAdd: (text: string) => void;
  onRemove: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    if (!draft.trim()) return;
    onAdd(draft.trim());
    setDraft("");
  };

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add a memory…"
          className="flex-1 rounded-lg bg-[#1C1C1E] px-3 py-2 text-[14px] text-white outline-none placeholder:text-[#8E8E93]"
        />
        <button type="button" onClick={submit} className="rounded-lg bg-white px-3 py-2 text-[13px] font-semibold text-black">
          Add
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-[#1C1C1E] px-4 py-5">
          <div className="text-[15px] font-medium text-white">No memories yet</div>
          <div className="mt-1 text-[13px] text-[#8E8E93]">Facts you add or extract from conversations will live here.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((m) => (
            <div key={m.id} className="flex items-start gap-3 rounded-2xl bg-[#1C1C1E] p-4">
              <div className="flex-1 text-[14px] leading-snug text-white">{m.text}</div>
              <button type="button" onClick={() => onRemove(m.id)} className="text-[12px] text-[#8E8E93]">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

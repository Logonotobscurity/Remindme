/**
 * Ask Omi panel for the Omi shell.
 * Grounded on local conversations and memories.
 */
import { useState } from "react";
import { askLocal, type AskResult } from "@/lib/ask";
import type { Conversation } from "@/lib/conversation";
import type { Memory } from "@/lib/memory";

export function AskOmi({
  conversations,
  memories,
  onOpenSource,
}: {
  conversations: Conversation[];
  memories: Memory[];
  onOpenSource?: (type: "conversation" | "memory", id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);

  const submit = () => {
    if (!q.trim()) return;
    setResult(askLocal(q, conversations, memories));
  };

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Ask about your conversations or memories…"
          className="flex-1 rounded-lg bg-[#1C1C1E] px-3 py-2 text-[14px] text-white outline-none placeholder:text-[#8E8E93]"
        />
        <button type="button" onClick={submit} className="rounded-lg bg-white px-3 py-2 text-[13px] font-semibold text-black">
          Ask
        </button>
      </div>

      {result && (
        <div className="rounded-2xl bg-[#1C1C1E] p-4">
          <div className="whitespace-pre-wrap text-[14px] leading-snug text-white">{result.answer}</div>
          {result.sources.length > 0 && (
            <div className="mt-3 space-y-1">
              {result.sources.map((s) => (
                <button
                  key={s.type + s.id}
                  type="button"
                  onClick={() => onOpenSource?.(s.type, s.id)}
                  className="block w-full rounded-lg bg-[#2C2C2E] px-3 py-2 text-left text-[12px] text-[#A1A1A6]"
                >
                  {s.type === "conversation" ? "Chat" : "Memory"}: {s.snippet}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!result && (
        <div className="rounded-2xl bg-[#1C1C1E] px-4 py-5">
          <div className="text-[15px] font-medium text-white">Ask Re:Mind Me</div>
          <div className="mt-1 text-[13px] text-[#8E8E93]">Answers come only from what you've captured on this device.</div>
        </div>
      )}
    </div>
  );
}

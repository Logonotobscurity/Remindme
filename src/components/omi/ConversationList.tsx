/**
 * Conversation list and detail for the Omi shell.
 */
import type { Conversation } from "@/lib/conversation";

export function ConversationList({
  items,
  onOpen,
}: {
  items: Conversation[];
  onOpen?: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-[#1C1C1E] px-4 py-5">
        <div className="text-[15px] font-medium text-white">No conversations yet</div>
        <div className="mt-1 text-[13px] text-[#8E8E93]">Capture with the mic or composer and they will appear here.</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onOpen?.(c.id)}
          className="block w-full rounded-2xl bg-[#1C1C1E] p-4 text-left"
        >
          <div className="text-[15px] font-medium text-white">{c.title}</div>
          <div className="mt-1 line-clamp-2 text-[13px] text-[#A1A1A6]">{c.summary}</div>
          {c.actionItems.length > 0 && (
            <div className="mt-2 text-[12px] text-[#8E8E93]">{c.actionItems.length} action{c.actionItems.length === 1 ? "" : "s"}</div>
          )}
        </button>
      ))}
    </div>
  );
}

export function ConversationDetail({
  item,
  onToggleAction,
  onBack,
}: {
  item: Conversation;
  onToggleAction: (actionId: string) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <button type="button" onClick={onBack} className="mb-3 text-[13px] text-[#8E8E93]">← Back</button>
      <h2 className="mb-2 text-[20px] font-semibold text-white">{item.title}</h2>
      <p className="mb-4 text-[14px] leading-snug text-[#A1A1A6]">{item.summary}</p>

      {item.actionItems.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 text-[13px] uppercase tracking-wide text-[#8E8E93]">Action items</div>
          <div className="space-y-2">
            {item.actionItems.map((a) => (
              <label key={a.id} className="flex gap-3">
                <input
                  type="checkbox"
                  checked={a.done}
                  onChange={() => onToggleAction(a.id)}
                  className="mt-1 h-4 w-4 rounded-full border border-[#8E8E93] bg-transparent"
                />
                <span className={`text-[14px] ${a.done ? "text-[#636366] line-through" : "text-white"}`}>{a.text}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-[#1C1C1E] p-4">
        <div className="mb-1 text-[12px] uppercase tracking-wide text-[#8E8E93]">Transcript</div>
        <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-white">{item.transcript}</p>
      </div>
    </div>
  );
}

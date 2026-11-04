/**
 * Horizontal Daily Recaps scroller.
 * Accepts the generated DailyRecap shape.
 */
import type { DailyRecap } from "@/lib/recap";

export function RecapScroller({
  recaps,
  onViewAll,
  onOpen,
}: {
  recaps: DailyRecap[];
  onViewAll?: () => void;
  onOpen?: (dateKey: string) => void;
}) {
  if (recaps.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h2 className="text-[17px] font-semibold text-white">Daily Recaps</h2>
        {onViewAll && (
          <button type="button" onClick={onViewAll} className="text-[15px] text-[#8E8E93]">
            View All
          </button>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {recaps.map((r) => (
          <article
            key={r.dateKey}
            onClick={() => onOpen?.(r.dateKey)}
            className="w-[260px] shrink-0 cursor-pointer rounded-2xl bg-[#1C1C1E] p-4"
          >
            <div className="mb-1 text-[13px] text-[#8E8E93]">{r.dateLabel}</div>
            <h3 className="text-[16px] font-semibold leading-snug text-white">{r.title}</h3>
            <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-[13px] leading-snug text-[#A1A1A6]">{r.body}</p>
            <div className="mt-2 text-[11px] text-[#636366]">
              {r.conversationCount} chats · {r.actionCount} open · {r.memoryCount} notes
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

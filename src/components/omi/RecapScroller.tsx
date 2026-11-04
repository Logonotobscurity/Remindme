type Recap = {
  id: string;
  dateLabel: string;
  title: string;
  preview?: string;
};

export function RecapScroller({
  recaps,
  onViewAll,
}: {
  recaps: Recap[];
  onViewAll?: () => void;
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
            key={r.id}
            className="w-[260px] shrink-0 rounded-2xl bg-[#1C1C1E] p-4"
          >
            <div className="mb-1 text-[13px] text-[#8E8E93]">{r.dateLabel}</div>
            <h3 className="text-[16px] font-semibold leading-snug text-white">{r.title}</h3>
            {r.preview && (
              <p className="mt-2 line-clamp-3 text-[14px] leading-snug text-[#A1A1A6]">{r.preview}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

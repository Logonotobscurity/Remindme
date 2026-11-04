type Session = {
  id: string;
  title: string;
  meta: string;
  icon?: string;
};

export function SessionList({
  groups,
}: {
  groups: { dateLabel: string; items: Session[] }[];
}) {
  if (groups.length === 0) return null;

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.dateLabel}>
          <h3 className="mb-2 px-1 text-[17px] font-semibold text-white">{g.dateLabel}</h3>
          <div className="space-y-2">
            {g.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-2xl bg-[#1C1C1E] px-3 py-3"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#3A3A3C] text-lg">
                  {item.icon ?? "·"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[16px] font-medium text-white">{item.title}</div>
                  <div className="text-[13px] text-[#8E8E93]">{item.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

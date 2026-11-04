import { ChevronRight, X } from "lucide-react";

type SettingsRow = {
  id: string;
  icon: React.ReactNode;
  label: string;
  badge?: "NEW" | "BETA";
  onClick?: () => void;
};

export function SettingsSheet({
  open,
  onClose,
  profile,
  groups,
}: {
  open: boolean;
  onClose: () => void;
  profile?: { name: string; email?: string };
  groups: { title?: string; rows: SettingsRow[] }[];
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose}>
      <div
        className="absolute inset-x-0 bottom-0 max-h-[92%] overflow-y-auto rounded-t-3xl bg-black px-5 pb-8 pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#3A3A3C]" />
        <div className="mb-4 flex items-center justify-between">
          <span className="w-10" />
          <h2 className="text-[17px] font-semibold text-white">Settings</h2>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {profile && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-[#1C1C1E] p-4">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#3A3A3C] text-white">
              {profile.name[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-[16px] font-medium text-white">{profile.name}</div>
              {profile.email && <div className="text-[13px] text-[#8E8E93]">{profile.email}</div>}
            </div>
            <ChevronRight className="h-4 w-4 text-[#8E8E93]" />
          </div>
        )}

        <div className="space-y-4">
          {groups.map((g, i) => (
            <div key={i} className="overflow-hidden rounded-2xl bg-[#1C1C1E]">
              {g.rows.map((row, idx) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={row.onClick}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${
                    idx < g.rows.length - 1 ? "border-b border-[#2C2C2E]" : ""
                  }`}
                >
                  <span className="grid h-8 w-8 place-items-center text-white">{row.icon}</span>
                  <span className="flex-1 text-[16px] text-white">{row.label}</span>
                  {row.badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        row.badge === "NEW" ? "bg-[#30D158] text-black" : "bg-[#FF9F0A] text-black"
                      }`}
                    >
                      {row.badge}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-[#8E8E93]" />
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

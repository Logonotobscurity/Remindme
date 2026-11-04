import { Pause, Smartphone } from "lucide-react";

export function ListeningPill({
  listening,
  onPause,
}: {
  listening: boolean;
  onPause: () => void;
}) {
  if (!listening) return null;

  return (
    <div className="mx-auto mb-6 flex h-12 w-full max-w-md items-center gap-3 rounded-full bg-[#1C1C1E] px-4">
      <Smartphone className="h-5 w-5 text-white" />
      <span className="h-2 w-2 rounded-full bg-[#FF3B30]" />
      <span className="flex-1 text-[15px] font-medium text-white">Listening</span>
      <button
        type="button"
        onClick={onPause}
        className="grid h-9 w-9 place-items-center rounded-full bg-[#2C2C2E] text-white"
        aria-label="Pause listening"
      >
        <Pause className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Omi-styled shell for Re:Mind Me.
 * Visual structure matches the reference frames.
 * MindOrb is the central visual and is not replaced.
 * Data is mapped from the existing reminder model.
 */
import { useEffect, useState } from "react";
import { Calendar, Search, Settings, Smartphone, Upload, Check } from "lucide-react";
import { MindOrb } from "@/components/MindOrb";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { loadReminders, persistReminders, type Reminder } from "@/lib/remind";
import { ListeningPill } from "./ListeningPill";
import { RecapScroller } from "./RecapScroller";
import { SessionList } from "./SessionList";
import { TasksView } from "./TasksView";
import { SettingsSheet } from "./SettingsSheet";
import { toRecaps, toSessionGroups, toTasks, overdueCount } from "./useOmiData";

type Tab = "home" | "tasks";

export function OmiRemindApp() {
  const { user } = useCurrentUserState();
  const scope = user?.id ?? "guest";
  const [tab, setTab] = useState<Tab>("home");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [listening, setListening] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReminders(loadReminders(scope));
    setReady(true);
  }, [scope]);

  const toggleTask = (id: string) => {
    const next = reminders.map((r) =>
      String(r.id) === id ? { ...r, completed: !r.completed } : r,
    );
    setReminders(next);
    persistReminders(next, scope);
  };

  if (!ready) {
    return <div className="grid min-h-screen place-items-center bg-black text-white">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-md px-5 pb-28 pt-6">
        {/* Top chrome */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex h-9 items-center gap-2 rounded-full bg-[#1C1C1E] px-3 text-[13px]">
            <Smartphone className="h-4 w-4" />
            Connect
          </div>
          <div className="flex gap-2">
            <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-[#1C1C1E]">
              <Calendar className="h-4 w-4" />
            </button>
            <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-[#1C1C1E]">
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-full bg-[#1C1C1E]"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex items-baseline gap-4">
          <button
            type="button"
            onClick={() => setTab("home")}
            className={`text-[30px] font-semibold tracking-tight ${tab === "home" ? "text-white" : "text-[#636366]"}`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => setTab("tasks")}
            className={`text-[30px] font-semibold tracking-tight ${tab === "tasks" ? "text-white" : "text-[#636366]"}`}
          >
            Tasks
          </button>
          <div className="ml-auto flex gap-2">
            <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-[#1C1C1E]">
              <Upload className="h-4 w-4" />
            </button>
            <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-[#1C1C1E]">
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>

        {tab === "home" && (
          <>
            <MindOrb
              listening={listening}
              recording={false}
              busy={false}
              catching={false}
              ready={ready}
              night={true}
            />
            <ListeningPill listening={listening} onPause={() => setListening(false)} />

            <RecapScroller recaps={toRecaps(reminders)} />
            <SessionList groups={toSessionGroups(reminders)} />

            {/* Bottom command bar */}
            <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md items-center gap-2 px-5 pb-6">
              <div className="flex h-14 flex-1 items-center rounded-full bg-[#1C1C1E] px-4">
                <span className="text-[15px] text-[#8E8E93]">Ask Re:Mind Me</span>
              </div>
              <button
                type="button"
                onClick={() => setListening((v) => !v)}
                className="grid h-14 w-14 place-items-center rounded-full bg-white text-black"
                aria-label="Listen"
              >
                ⏹
              </button>
              <button type="button" className="grid h-14 w-14 place-items-center rounded-full bg-[#1C1C1E]">
                ⏹
              </button>
            </div>
          </>
        )}

        {tab === "tasks" && (
          <TasksView
            tasks={toTasks(reminders)}
            overdueCount={overdueCount(reminders)}
            onAdd={() => setTab("home")}
            onToggle={toggleTask}
          />
        )}
      </div>

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={user ? { name: user.name ?? "You", email: user.email } : undefined}
        groups={[
          {
            rows: [
              { id: "plan", icon: "📊", label: "Plan & Usage" },
              { id: "ref", icon: "🎁", label: "Referral Program", badge: "NEW" },
            ],
          },
          {
            rows: [
              { id: "device", icon: "📱", label: "Device" },
              { id: "rec", icon: "🎤", label: "Recording & Transcription" },
              { id: "voice", icon: "🔊", label: "Voice" },
              { id: "notif", icon: "🔔", label: "Notifications & Display" },
              { id: "int", icon: "🔗", label: "Integrations", badge: "BETA" },
              { id: "priv", icon: "🛡", label: "Data & Privacy" },
            ],
          },
          {
            rows: [
              { id: "mem", icon: "🧠", label: "Memories" },
              { id: "goals", icon: "🎯", label: "Goals" },
            ],
          },
        ]}
      />
    </div>
  );
}

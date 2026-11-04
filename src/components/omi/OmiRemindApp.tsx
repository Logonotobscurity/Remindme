/**
 * Omi-styled shell for Re:Mind Me.
 * Visual structure matches the reference frames.
 * MindOrb is the central visual and is not replaced.
 */
import { useEffect, useState } from "react";
import { Calendar, Search, Settings, Smartphone, Upload, Check, Mic, Square } from "lucide-react";
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
    return (
      <div className="grid min-h-screen place-items-center bg-black">
        <MindOrb listening={false} recording={false} busy={false} catching={false} ready={false} night />
      </div>
    );
  }

  const recaps = toRecaps(reminders);
  const groups = toSessionGroups(reminders);
  const tasks = toTasks(reminders);
  const overdue = overdueCount(reminders);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-md px-5 pb-32 pt-6">
        {/* Top chrome */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex h-9 items-center gap-2 rounded-full bg-[#1C1C1E] px-3 text-[13px] text-[#A1A1A6]">
            <Smartphone className="h-4 w-4" />
            Connect
          </div>
          <div className="flex gap-2">
            <IconBtn><Calendar className="h-4 w-4" /></IconBtn>
            <IconBtn><Search className="h-4 w-4" /></IconBtn>
            <IconBtn onClick={() => setSettingsOpen(true)}><Settings className="h-4 w-4" /></IconBtn>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex items-baseline gap-5">
          <TabBtn active={tab === "home"} onClick={() => setTab("home")}>Home</TabBtn>
          <TabBtn active={tab === "tasks"} onClick={() => setTab("tasks")}>Tasks</TabBtn>
          <div className="ml-auto flex gap-2">
            <IconBtn><Upload className="h-4 w-4" /></IconBtn>
            <IconBtn><Check className="h-4 w-4" /></IconBtn>
          </div>
        </div>

        {tab === "home" && (
          <>
            <div className="mb-2 flex justify-center">
              <MindOrb
                listening={listening}
                recording={false}
                busy={false}
                catching={false}
                ready={ready}
                night
              />
            </div>
            <ListeningPill listening={listening} onPause={() => setListening(false)} />

            {recaps.length > 0 ? (
              <RecapScroller recaps={recaps} />
            ) : (
              <EmptyHint title="No recaps yet" body="Capture a reminder and it will appear here as a daily recap." />
            )}

            {groups.length > 0 ? (
              <SessionList groups={groups} />
            ) : (
              <EmptyHint title="Quiet day" body="Your sessions will group by date once you start adding reminders." />
            )}

            {/* Bottom command bar */}
            <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md items-center gap-2 bg-gradient-to-t from-black via-black/80 to-transparent px-5 pb-6 pt-8">
              <div className="flex h-14 flex-1 items-center rounded-full bg-[#1C1C1E] px-4 text-[15px] text-[#8E8E93]">
                Ask Re:Mind Me
              </div>
              <button
                type="button"
                onClick={() => setListening((v) => !v)}
                className="grid h-14 w-14 place-items-center rounded-full bg-white text-black shadow-lg"
                aria-label={listening ? "Stop listening" : "Start listening"}
              >
                {listening ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <IconBtn size="lg"><Square className="h-5 w-5" /></IconBtn>
            </div>
          </>
        )}

        {tab === "tasks" && (
          <TasksView
            tasks={tasks}
            overdueCount={overdue}
            onAdd={() => setTab("home")}
            onToggle={toggleTask}
          />
        )}
      </div>

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={user ? { name: user.name ?? "You", email: user.email } : { name: "Guest" }}
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

function IconBtn({
  children,
  onClick,
  size = "md",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  size?: "md" | "lg";
}) {
  const s = size === "lg" ? "h-14 w-14" : "h-9 w-9";
  return (
    <button type="button" onClick={onClick} className={`grid ${s} place-items-center rounded-full bg-[#1C1C1E] text-white`}>
      {children}
    </button>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[30px] font-semibold tracking-tight transition-colors ${active ? "text-white" : "text-[#636366]"}`}
    >
      {children}
    </button>
  );
}

function EmptyHint({ title, body }: { title: string; body: string }) {
  return (
    <div className="mb-6 rounded-2xl bg-[#1C1C1E] px-4 py-5">
      <div className="text-[15px] font-medium text-white">{title}</div>
      <div className="mt-1 text-[13px] leading-snug text-[#8E8E93]">{body}</div>
    </div>
  );
}

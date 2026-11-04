/**
 * Fully interactive Omi-styled shell.
 * MindOrb remains central. Search, voice, composer, and settings actions work.
 */
import { useEffect, useState } from "react";
import { Calendar, Search, Settings, Smartphone, Upload, Check, Mic, Square } from "lucide-react";
import { MindOrb } from "@/components/MindOrb";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { loadReminders, persistReminders, loadSaves, clearAllData, type Reminder, type SaveItem } from "@/lib/remind";
import { ListeningPill } from "./ListeningPill";
import { RecapScroller } from "./RecapScroller";
import { SessionList } from "./SessionList";
import { TasksView } from "./TasksView";
import { SettingsSheet } from "./SettingsSheet";
import { Composer } from "./Composer";
import { SaveList, GraveyardList, DashboardSummary } from "./MoreTabs";
import { CategoryManager } from "./CategoryManager";
import { SearchOverlay } from "./SearchOverlay";
import { useVoice } from "./useVoice";
import { toRecaps, toSessionGroups, toTasks, overdueCount } from "./useOmiData";

type Tab = "home" | "tasks" | "save" | "graveyard" | "dashboard";

export function OmiRemindApp() {
  const { user } = useCurrentUserState();
  const scope = user?.id ?? "guest";
  const [tab, setTab] = useState<Tab>("home");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [saves, setSaves] = useState<SaveItem[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const voice = useVoice();

  useEffect(() => {
    setReminders(loadReminders(scope));
    setSaves(loadSaves(scope));
    setReady(true);
  }, [scope]);

  const toggleTask = (id: string) => {
    const next = reminders.map((r) =>
      String(r.id) === id ? { ...r, completed: !r.completed } : r,
    );
    setReminders(next);
    persistReminders(next, scope);
  };

  const askNotify = async () => {
    if (typeof Notification === "undefined") return;
    await Notification.requestPermission();
  };

  const clearAll = () => {
    if (!confirm("Clear all local reminders, saves, and categories on this device?")) return;
    clearAllData(scope);
    setReminders([]);
    setSaves([]);
    setSettingsOpen(false);
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
        <div className="mb-5 flex items-center justify-between">
          <div className="flex h-9 items-center gap-2 rounded-full bg-[#1C1C1E] px-3 text-[13px] text-[#A1A1A6]">
            <Smartphone className="h-4 w-4" />
            Connect
          </div>
          <div className="flex gap-2">
            <IconBtn><Calendar className="h-4 w-4" /></IconBtn>
            <IconBtn onClick={() => setSearchOpen(true)}><Search className="h-4 w-4" /></IconBtn>
            <IconBtn onClick={() => setSettingsOpen(true)}><Settings className="h-4 w-4" /></IconBtn>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <TabBtn active={tab === "home"} onClick={() => setTab("home")}>Home</TabBtn>
          <TabBtn active={tab === "tasks"} onClick={() => setTab("tasks")}>Tasks</TabBtn>
          <TabBtn active={tab === "save"} onClick={() => setTab("save")}>Save</TabBtn>
          <TabBtn active={tab === "graveyard"} onClick={() => setTab("graveyard")}>Graveyard</TabBtn>
          <TabBtn active={tab === "dashboard"} onClick={() => setTab("dashboard")}>Dash</TabBtn>
          <div className="ml-auto flex gap-2">
            <IconBtn><Upload className="h-4 w-4" /></IconBtn>
            <IconBtn><Check className="h-4 w-4" /></IconBtn>
          </div>
        </div>

        {tab === "home" && (
          <>
            <div className="mb-2 flex justify-center">
              <MindOrb listening={voice.listening} recording={false} busy={false} catching={false} ready={ready} night />
            </div>
            <ListeningPill listening={voice.listening} onPause={voice.stop} />
            {voice.transcript && (
              <div className="mb-3 rounded-2xl bg-[#1C1C1E] px-4 py-3 text-[14px] text-white">
                {voice.transcript}
              </div>
            )}
            <Composer reminders={reminders} scope={scope} onSaved={setReminders} />
            {recaps.length > 0 ? <RecapScroller recaps={recaps} /> : <EmptyHint title="No recaps yet" body="Capture a reminder and it will appear here." />}
            {groups.length > 0 ? <SessionList groups={groups} /> : null}
            <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md items-center gap-2 bg-gradient-to-t from-black via-black/80 to-transparent px-5 pb-6 pt-8">
              <div className="flex h-14 flex-1 items-center rounded-full bg-[#1C1C1E] px-4 text-[15px] text-[#8E8E93]">Ask Re:Mind Me</div>
              <button type="button" onClick={voice.start} className="grid h-14 w-14 place-items-center rounded-full bg-white text-black shadow-lg" aria-label="Listen">
                {voice.listening ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <IconBtn size="lg" onClick={voice.stop}><Square className="h-5 w-5" /></IconBtn>
            </div>
          </>
        )}

        {tab === "tasks" && <TasksView tasks={tasks} overdueCount={overdue} onAdd={() => setTab("home")} onToggle={toggleTask} />}
        {tab === "save" && <SaveList items={saves} />}
        {tab === "graveyard" && <GraveyardList items={reminders} />}
        {tab === "dashboard" && (
          <div className="space-y-6">
            <DashboardSummary reminders={reminders} saves={saves} />
            <CategoryManager scope={scope} />
          </div>
        )}
      </div>

      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        reminders={reminders}
        saves={saves}
        onOpenReminder={() => setTab("home")}
        onOpenSave={() => setTab("save")}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={user ? { name: user.name ?? "You", email: user.email } : { name: "Guest" }}
        groups={[
          { rows: [{ id: "plan", icon: "📊", label: "Plan & Usage" }, { id: "ref", icon: "🎁", label: "Referral Program", badge: "NEW" }] },
          {
            rows: [
              { id: "device", icon: "📱", label: "Device" },
              { id: "rec", icon: "🎤", label: "Recording & Transcription", onClick: () => voice.start() },
              { id: "voice", icon: "🔊", label: "Voice", onClick: () => voice.start() },
              { id: "notif", icon: "🔔", label: "Notifications & Display", onClick: askNotify },
              { id: "int", icon: "🔗", label: "Integrations", badge: "BETA" },
              { id: "priv", icon: "🛡", label: "Data & Privacy", onClick: clearAll },
            ],
          },
          { rows: [{ id: "mem", icon: "🧠", label: "Memories", onClick: () => { setSettingsOpen(false); setTab("dashboard"); } }, { id: "goals", icon: "🎯", label: "Goals" }] },
        ]}
      />
    </div>
  );
}

function IconBtn({ children, onClick, size = "md" }: { children: React.ReactNode; onClick?: () => void; size?: "md" | "lg" }) {
  const s = size === "lg" ? "h-14 w-14" : "h-9 w-9";
  return <button type="button" onClick={onClick} className={`grid ${s} place-items-center rounded-full bg-[#1C1C1E] text-white`}>{children}</button>;
}
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`text-[22px] font-semibold tracking-tight ${active ? "text-white" : "text-[#636366]"}`}>{children}</button>;
}
function EmptyHint({ title, body }: { title: string; body: string }) {
  return <div className="mb-6 rounded-2xl bg-[#1C1C1E] px-4 py-5"><div className="text-[15px] font-medium text-white">{title}</div><div className="mt-1 text-[13px] text-[#8E8E93]">{body}</div></div>;
}

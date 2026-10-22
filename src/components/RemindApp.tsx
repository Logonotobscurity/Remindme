import { useEffect, useRef, useState, type ReactNode } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { activityApiFetch } from "@/lib/activity/api-client";
import {
  Archive,
  Bell,
  Bookmark,
  Calendar,
  Check,
  ChevronLeft,
  Clock,
  HelpCircle,
  ImageIcon,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  Mic,
  MoonStar,
  PauseCircle,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  User,
  Video,
  X,
} from "lucide-react";
import {
  CATEGORY_ICONS,
  DEFAULT_CATEGORIES,
  NOTE_COLORS,
  type Category,
  type Draft,
  type MediaKind,
  type Profile,
  type Reminder,
  type SaveItem,
  clearAllData,
  combineDateTime,
  dateChip,
  firstUrl,
  formatTimeLabel,
  getTimeAgo,
  hostnameOf,
  hhmm,
  loadCategories,
  loadProfile,
  loadReminders,
  loadSaves,
  parseReminder,
  parseSave,
  persistCategories,
  persistProfile,
  persistReminders,
  persistSaves,
  toDateInput,
} from "@/lib/remind";
import { DashboardTab } from "./DashboardTab";

type Tab = "remind" | "save" | "reminder" | "graveyard" | "dashboard";
type SpeechCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechCtor(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { webkitSpeechRecognition?: SpeechCtor; SpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

const REMIND_CHIPS = [
  { label: "Tomorrow morning", value: "tomorrow at 8 AM " },
  { label: "Later this afternoon", value: "today at 5 PM " },
  { label: "Next week", value: "next week at 9 AM " },
  { label: "In 1 hour", value: "in 1 hour " },
];

const SAVE_CHIPS = [
  { label: "Idea", prefix: "idea: " },
  { label: "Place", prefix: "place in " },
  { label: "Link", prefix: "save link " },
  { label: "Note", prefix: "note: " },
];

type CapturedActivity = {
  title: string;
  summary?: string;
  category: string;
  activityType: "reminder" | "note";
  sourceReference: string;
  completionStatus?: "recorded" | "in_progress" | "completed" | "archived";
};

function MediaThumb({
  src,
  kind,
  className,
}: {
  src: string;
  kind: MediaKind | null;
  className: string;
}) {
  if (kind === "video") {
    return <video src={src} className={className} muted playsInline />;
  }
  return <img src={src} alt="" className={className} />;
}

export function RemindApp() {
  const { user, isPending: authPending } = useCurrentUserState();
  const storageScope = user?.id ?? "guest";
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("remind");
  const [input, setInput] = useState("");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [saves, setSaves] = useState<SaveItem[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [saveView, setSaveView] = useState<"list" | "card">("list");
  const [listView, setListView] = useState<"list" | "card">("list");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [recordingVideo, setRecordingVideo] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<{ type: "reminder" | "save"; id: number } | null>(null);
  const [editForm, setEditForm] = useState({ text: "", location: "", date: "", time: "", color: "#ffffff" });
  const [showCategory, setShowCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("📌");
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [toast, setToast] = useState<{ message: string; undo?: { type: "reminder" | "save"; item: Reminder | SaveItem } } | null>(null);
  const [success, setSuccess] = useState(false);
  const [notifyOn, setNotifyOn] = useState(false);
  const [autoSlumber, setAutoSlumber] = useState(false);
  const [slumberOverride, setSlumberOverride] = useState<boolean | null>(null);
  const [engagedChip, setEngagedChip] = useState<string | null>(null);
  const slumberMode = slumberOverride ?? autoSlumber;

  const remindersRef = useRef(reminders);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const speechRef = useRef<{ stop: () => void } | null>(null);
  remindersRef.current = reminders;

  // Follow local evening/night hours by default. The header toggle can override
  // the automatic schedule for the current session.
  useEffect(() => {
    const syncSlumber = () => {
      const hour = new Date().getHours();
      setAutoSlumber(hour >= 19 || hour < 7);
    };
    syncSlumber();
    const id = window.setInterval(syncSlumber, 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Local reminders and saved items remain usable offline. Only send new events
  // when a real account session has resolved; never send a client-supplied user id.
  // Existing browser-local items are intentionally not backfilled into whichever
  // account signs in next.
  const canCaptureItem = (ownerId?: string) =>
    Boolean(!authPending && user?.id && ownerId === user.id);

  const captureActivity = (event: CapturedActivity) => {
    if (authPending || !user) return;
    void activityApiFetch("/api/v1/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "pwa",
        title: event.title.slice(0, 240),
        summary: event.summary?.slice(0, 4000),
        category: event.category.slice(0, 80),
        activityType: event.activityType,
        sourceReference: event.sourceReference.slice(0, 500),
        captureMethod: "manual",
        privacyLevel: "private",
        completionStatus: event.completionStatus ?? "recorded",
        occurredAt: new Date().toISOString(),
      }),
    }).catch(() => {
      // Local capture must not fail just because the network or API is unavailable.
    });
  };

  useEffect(() => {
    if (authPending) return;
    const loadedReminders = loadReminders(storageScope);
    setReminders(loadedReminders);
    persistReminders(loadedReminders, storageScope);
    setSaves(loadSaves(storageScope));
    setCategories(loadCategories(storageScope));
    const stored = loadProfile(storageScope);
    setProfile(stored);
    setNameDraft(stored?.name ?? "");
    setNotifyOn(typeof Notification !== "undefined" && Notification.permission === "granted");
    setLoadedScope(storageScope);
    setReady(true);
  }, [authPending, storageScope]);

  useEffect(() => {
    const tick = () => {
      if (authPending || loadedScope !== storageScope) return;
      const now = Date.now();
      const current = remindersRef.current;
      let changed = false;
      const next = current.map((item) => {
        const inactive = item.status === "parked" || item.status === "archived" || item.completed;
        if (inactive) return item;
        if (item.time <= now) {
          const statusChanged = item.status !== "overdue";
          const shouldNotify = !item.notified;
          if (statusChanged || shouldNotify) changed = true;
          if (shouldNotify && typeof Notification !== "undefined" && Notification.permission === "granted") {
            try {
              new Notification("Re:Mind Me", { body: item.text });
            } catch {
              /* preview may block notifications */
            }
          }
          return statusChanged || shouldNotify ? { ...item, status: "overdue" as const, notified: true } : item;
        }
        if (item.status === "overdue") {
          changed = true;
          return { ...item, status: "scheduled" as const };
        }
        return item;
      });
      if (changed) {
        setReminders(next);
        persistReminders(next, storageScope);
      }
    };
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, [authPending, loadedScope, storageScope]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const flash = (message: string, undo?: { type: "reminder" | "save"; item: Reminder | SaveItem }) => {
    setToast({ message, undo });
  };

  const popSuccess = () => {
    setSuccess(true);
    window.setTimeout(() => setSuccess(false), 900);
  };

  const attachment = () => {
    if (video) return { photo: video, mediaKind: "video" as const };
    if (photo) return { photo, mediaKind: "image" as const };
    return { photo: null, mediaKind: null };
  };

  const resetComposer = () => {
    setInput("");
    setPhoto(null);
    setVideo(null);
    setShowManual(false);
    setManualDate("");
    setManualTime("");
    setManualLocation("");
    setBusy(false);
    stopCapture();
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    resetComposer();
    if (next === "save") setSelectedCategory(null);
  };

  const onPhoto = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const stopCapture = () => {
    speechRef.current?.stop();
    speechRef.current = null;
    if (recorderRef.current && recorderRef.current.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setListening(false);
    setRecordingVideo(false);
  };

  const startVoice = () => {
    if (listening) {
      stopCapture();
      return;
    }
    const Ctor = getSpeechCtor();
    if (!Ctor) {
      flash("Voice typing isn't available in this browser. Type it instead.");
      return;
    }
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (event) => {
      const text = Array.from(event.results)
        .map((row) => row[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (text) setInput(text);
    };
    rec.onerror = () => {
      setListening(false);
      flash("Couldn't hear that. Try again, or just type it.");
    };
    rec.onend = () => setListening(false);
    speechRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
      flash("Microphone is busy. Try again in a second.");
    }
  };

  const startVideo = async () => {
    if (recordingVideo) {
      stopCapture();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
        const reader = new FileReader();
        reader.onloadend = () => setVideo(typeof reader.result === "string" ? reader.result : null);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((track) => track.stop());
        setRecordingVideo(false);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecordingVideo(true);
      window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 20000);
    } catch {
      flash("Camera isn't available here.");
    }
  };

  const askNotify = async () => {
    if (typeof Notification === "undefined") {
      flash("Notifications aren't supported in this browser.");
      return;
    }
    const result = await Notification.requestPermission();
    setNotifyOn(result === "granted");
    flash(result === "granted" ? "Notifications are on." : "Notifications stayed off.");
  };

  const openDraft = async (kind: "reminder" | "save") => {
    const media = attachment();
    if (!input.trim() && !media.photo) return;
    setBusy(true);
    await new Promise((resolve) => window.setTimeout(resolve, 220));
    const next =
      kind === "reminder"
        ? parseReminder(input, media.photo, media.mediaKind)
        : parseSave(input, media.photo, media.mediaKind);
    setDraft(next);
    setBusy(false);
  };

  const saveReminderDraft = () => {
    if (!draft || draft.type !== "reminder") return;
    const item: Reminder = {
      id: Date.now(),
      text: draft.text.trim() || "Reminder",
      photo: draft.photo,
      mediaKind: draft.mediaKind,
      time: draft.time,
      timeLabel: formatTimeLabel(draft.time),
      location: draft.location.trim() || null,
      notified: false,
      completed: false,
      status: draft.time <= Date.now() ? "overdue" : "scheduled",
      created: Date.now(),
      color: "#ffffff",
      activityOwnerId: !authPending ? user?.id : undefined,
    };
    const next = [item, ...reminders];
    setReminders(next);
    persistReminders(next, storageScope);
    captureActivity({
      title: "Reminder created: " + item.text,
      summary: [item.timeLabel, item.location].filter(Boolean).join(" • "),
      category: "Reminder",
      activityType: "reminder",
      sourceReference: "remindme:reminder:" + item.id + ":created",
    });
    setDraft(null);
    resetComposer();
    popSuccess();
    flash("Reminder saved");
    window.setTimeout(() => setTab("reminder"), 400);
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission().then((result) => setNotifyOn(result === "granted"));
    }
  };

  const saveItemDraft = () => {
    if (!draft || draft.type !== "save") return;
    const item: SaveItem = {
      id: Date.now(),
      text: draft.text.trim() || "Saved item",
      photo: draft.photo,
      mediaKind: draft.mediaKind,
      location: draft.location.trim() || null,
      category: draft.categoryId,
      created: Date.now(),
      color: "#ffffff",
      activityOwnerId: !authPending ? user?.id : undefined,
    };
    const next = [item, ...saves];
    setSaves(next);
    persistSaves(next, storageScope);
    const name = categories.find((c) => c.id === draft.categoryId)?.name ?? "Saved";
    captureActivity({
      title: "Saved item: " + item.text,
      summary: [name, item.location].filter(Boolean).join(" • "),
      category: name,
      activityType: "note",
      sourceReference: "remindme:save:" + item.id + ":created",
    });
    setDraft(null);
    resetComposer();
    popSuccess();
    flash(`Saved to ${name}`);
  };

  const addManual = () => {
    const media = attachment();
    if ((!input.trim() && !media.photo) || !manualDate || !manualTime) {
      flash("Pick a date and a time first.");
      return;
    }
    const time = combineDateTime(manualDate, manualTime);
    if (Number.isNaN(time)) {
      flash("That date doesn't look right.");
      return;
    }
    const item: Reminder = {
      id: Date.now(),
      text: input.trim() || (media.mediaKind === "video" ? "Video reminder" : "Photo reminder"),
      photo: media.photo,
      mediaKind: media.mediaKind,
      time,
      timeLabel: formatTimeLabel(time),
      location: manualLocation.trim() || null,
      notified: false,
      completed: false,
      status: time <= Date.now() ? "overdue" : "scheduled",
      created: Date.now(),
      color: "#ffffff",
      activityOwnerId: !authPending ? user?.id : undefined,
    };
    const next = [item, ...reminders];
    setReminders(next);
    persistReminders(next, storageScope);
    captureActivity({
      title: "Reminder created: " + item.text,
      summary: [item.timeLabel, item.location].filter(Boolean).join(" • "),
      category: "Reminder",
      activityType: "reminder",
      sourceReference: "remindme:reminder:" + item.id + ":created",
    });
    resetComposer();
    popSuccess();
    flash("Reminder saved");
    window.setTimeout(() => setTab("reminder"), 400);
  };

  const addSaveTo = (category: Category) => {
    const media = attachment();
    if (!input.trim() && !media.photo) return;
    const item: SaveItem = {
      id: Date.now(),
      text: input.trim() || (media.mediaKind === "video" ? "Video" : "Photo"),
      photo: media.photo,
      mediaKind: media.mediaKind,
      location: null,
      category: category.id,
      created: Date.now(),
      color: "#ffffff",
      activityOwnerId: !authPending ? user?.id : undefined,
    };
    const next = [item, ...saves];
    setSaves(next);
    persistSaves(next, storageScope);
    captureActivity({
      title: "Saved item: " + item.text,
      summary: [category.name, item.location].filter(Boolean).join(" • "),
      category: category.name,
      activityType: "note",
      sourceReference: "remindme:save:" + item.id + ":created",
    });
    resetComposer();
    setSelectedCategory(null);
    popSuccess();
    flash(`Saved to ${category.name}`);
  };

  const removeItem = (id: number, type: "reminder" | "save") => {
    if (type === "reminder") {
      const item = reminders.find((r) => r.id === id);
      const next = reminders.filter((r) => r.id !== id);
      setReminders(next);
      persistReminders(next, storageScope);
      if (item) {
        if (canCaptureItem(item.activityOwnerId)) captureActivity({
          title: "Reminder deleted: " + item.text,
          summary: "Removed from the local reminder list.",
          category: "Reminder",
          activityType: "reminder",
          completionStatus: "completed",
          sourceReference: "remindme:reminder:" + item.id + ":deleted:" + Date.now(),
        });
        flash("Reminder deleted", { type, item });
      }
    } else {
      const item = saves.find((s) => s.id === id);
      const next = saves.filter((s) => s.id !== id);
      setSaves(next);
      persistSaves(next, storageScope);
      if (item) {
        if (canCaptureItem(item.activityOwnerId)) captureActivity({
          title: "Saved item removed: " + item.text,
          summary: "Removed from the local saved-items list.",
          category: "Saved item",
          activityType: "note",
          completionStatus: "completed",
          sourceReference: "remindme:save:" + item.id + ":deleted:" + Date.now(),
        });
        flash("Item deleted", { type, item });
      }
    }
  };

  const undo = () => {
    if (!toast?.undo) return;
    if (toast.undo.type === "reminder") {
      const item = toast.undo.item as Reminder;
      const next = [item, ...reminders];
      setReminders(next);
      persistReminders(next, storageScope);
      if (canCaptureItem(item.activityOwnerId)) captureActivity({
        title: "Reminder restored: " + item.text,
        summary: item.timeLabel,
        category: "Reminder",
        activityType: "reminder",
        sourceReference: "remindme:reminder:" + item.id + ":restored:" + Date.now(),
      });
    } else {
      const item = toast.undo.item as SaveItem;
      const next = [item, ...saves];
      setSaves(next);
      persistSaves(next, storageScope);
      if (canCaptureItem(item.activityOwnerId)) captureActivity({
        title: "Saved item restored: " + item.text,
        summary: item.location ?? undefined,
        category: "Saved item",
        activityType: "note",
        sourceReference: "remindme:save:" + item.id + ":restored:" + Date.now(),
      });
    }
    setToast(null);
  };

  const toggleDone = (id: number) => {
    const current = reminders.find((item) => item.id === id);
    const next = reminders.map((item) =>
      item.id === id
        ? { ...item, completed: !item.completed, status: item.completed ? (item.time <= Date.now() ? "overdue" as const : "scheduled" as const) : "completed" as const }
        : item,
    );
    setReminders(next);
    persistReminders(next, storageScope);
    if (current && canCaptureItem(current.activityOwnerId)) {
      const isCompleting = !current.completed;
      captureActivity({
        title: (isCompleting ? "Reminder completed: " : "Reminder reopened: ") + current.text,
        summary: current.timeLabel,
        category: "Reminder",
        activityType: "reminder",
        completionStatus: isCompleting ? "completed" : "in_progress",
        sourceReference: "remindme:reminder:" + current.id + ":" + (isCompleting ? "completed:" : "reopened:") + Date.now(),
      });
    }
  };

  const changeReminderStatus = (id: number, target: "scheduled" | "parked" | "archived") => {
    const current = reminders.find((item) => item.id === id);
    if (!current) return;
    const status = target === "scheduled" && current.time <= Date.now() ? "overdue" : target;
    const updated = {
      ...current,
      completed: false,
      status,
      notified: status === "scheduled" ? false : true,
    };
    const next = reminders.map((item) => item.id === id ? updated : item);
    setReminders(next);
    persistReminders(next, storageScope);
    if (canCaptureItem(current.activityOwnerId)) {
      const verb = status === "parked" ? "parked" : status === "archived" ? "archived" : "restored";
      captureActivity({
        title: "Reminder " + verb + ": " + current.text,
        summary: current.timeLabel,
        category: "Reminder",
        activityType: "reminder",
        completionStatus: status === "archived" ? "archived" : "in_progress",
        sourceReference: "remindme:reminder:" + current.id + ":" + verb + ":" + Date.now(),
      });
    }
    flash(status === "parked" ? "Reminder parked" : status === "archived" ? "Moved to the Graveyard" : "Reminder brought back");
  };

  const beginEdit = (item: Reminder | SaveItem, type: "reminder" | "save") => {
    setEditing({ type, id: item.id });
    if (type === "reminder" && "time" in item) {
      const date = new Date(item.time);
      setEditForm({
        text: item.text,
        location: item.location ?? "",
        date: toDateInput(item.time),
        time: hhmm(date),
        color: item.color || "#ffffff",
      });
    } else {
      setEditForm({ text: item.text, location: item.location ?? "", date: "", time: "", color: item.color || "#ffffff" });
    }
  };

  const commitEdit = () => {
    if (!editing) return;
    if (editing.type === "reminder") {
      const time = combineDateTime(editForm.date, editForm.time);
      const next = reminders.map((item) =>
        item.id === editing.id
          ? {
              ...item,
              text: editForm.text.trim() || item.text,
              location: editForm.location.trim() || null,
              time: Number.isNaN(time) ? item.time : time,
              timeLabel: Number.isNaN(time) ? item.timeLabel : formatTimeLabel(time),
              color: editForm.color,
              notified: Number.isNaN(time) ? item.notified : time > Date.now() ? false : item.notified,
              status: item.completed
                ? "completed" as const
                : Number.isNaN(time)
                  ? item.status
                  : time > Date.now()
                    ? "scheduled" as const
                    : "overdue" as const,
            }
          : item,
      );
      setReminders(next);
      persistReminders(next, storageScope);
      const updated = next.find((item) => item.id === editing.id);
      if (updated && canCaptureItem(updated.activityOwnerId)) {
        captureActivity({
          title: "Reminder updated: " + updated.text,
          summary: [updated.timeLabel, updated.location].filter(Boolean).join(" • "),
          category: "Reminder",
          activityType: "reminder",
          sourceReference: "remindme:reminder:" + updated.id + ":updated:" + Date.now(),
        });
      }
    } else {
      const next = saves.map((item) =>
        item.id === editing.id
          ? { ...item, text: editForm.text.trim() || item.text, location: editForm.location.trim() || null, color: editForm.color }
          : item,
      );
      setSaves(next);
      persistSaves(next, storageScope);
      const updated = next.find((item) => item.id === editing.id);
      if (updated && canCaptureItem(updated.activityOwnerId)) {
        captureActivity({
          title: "Saved item updated: " + updated.text,
          summary: updated.location ?? undefined,
          category: "Saved item",
          activityType: "note",
          sourceReference: "remindme:save:" + updated.id + ":updated:" + Date.now(),
        });
      }
    }
    setEditing(null);
    flash("Changes saved");
  };

  const commitCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (editingCategoryId) {
      const next = categories.map((cat) => (cat.id === editingCategoryId ? { ...cat, name, icon: newCategoryIcon } : cat));
      setCategories(next);
      persistCategories(next, storageScope);
    } else {
      const next = [
        ...categories,
        { id: `custom_${Date.now()}`, name, icon: newCategoryIcon, color: "#E5E7EB", custom: true },
      ];
      setCategories(next);
      persistCategories(next, storageScope);
    }
    setNewCategoryName("");
    setNewCategoryIcon("📌");
    setEditingCategoryId(null);
    setShowCategory(false);
  };

  const removeCategory = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat?.custom) return;
    const next = categories.filter((c) => c.id !== id);
    setCategories(next);
    persistCategories(next, storageScope);
    if (selectedCategory === id) setSelectedCategory(null);
  };

  const signIn = () => {
    const name = nameDraft.trim();
    if (!name) return;
    const next = { name };
    setProfile(next);
    persistProfile(next, storageScope);
  };

  const signOut = () => {
    setProfile(null);
    setNameDraft("");
    persistProfile(null, storageScope);
  };

  const wipe = () => {
    clearAllData(storageScope);
    setReminders([]);
    setSaves([]);
    setCategories(DEFAULT_CATEGORIES);
    setProfile(null);
    setNameDraft("");
    setShowSettings(false);
    flash("This workspace’s data on this device was cleared");
  };

  const filteredReminders = query.trim()
    ? reminders.filter((item) => `${item.text} ${item.location ?? ""}`.toLowerCase().includes(query.toLowerCase()))
    : reminders;
  const filteredSaves = query.trim()
    ? saves.filter((item) => `${item.text} ${item.location ?? ""}`.toLowerCase().includes(query.toLowerCase()))
    : saves;
  const categoryItems =
    selectedCategory && selectedCategory !== "manual" ? saves.filter((item) => item.category === selectedCategory) : saves;
  const activeReminders = reminders.filter((item) => item.status !== "parked" && item.status !== "archived" && item.status !== "overdue");
  const graveyardReminders = reminders.filter((item) =>
    item.status === "parked" || item.status === "archived" ||
    (!item.completed && (item.status === "overdue" || item.time <= Date.now())),
  );

  const canCompose = Boolean(input.trim() || photo || video);

  if (!ready || authPending || loadedScope !== storageScope) {
    return (
      <div className="flex h-dvh items-center justify-center bg-paper">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-sm text-mute">Opening Re:Mind Me</p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-slumber={slumberMode ? "true" : "false"}
      className={`remind-shell relative mx-auto flex h-dvh w-full max-w-6xl flex-col overflow-hidden bg-paper text-ink shadow-2xl shadow-slate-300/40 transition-colors duration-700 ${slumberMode ? "is-slumber" : ""}`}
    >
      <header className="app-topbar z-20 border-b border-line px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setShowMenu(true)}
            className="flex size-11 items-center justify-center rounded-xl hover:bg-slate-100"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-white">
              <Sparkles size={16} />
            </span>
            <span className="text-lg font-bold tracking-tight">Re:Mind Me</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={slumberMode ? "Switch to day mode" : "Switch to Slumber Mode"}
              title={slumberOverride === null ? "Automatic Slumber Mode: 7 PM–7 AM. Click to override." : "Slumber Mode is manually overridden until reload."}
              onClick={() => setSlumberOverride(!slumberMode)}
              className="flex size-11 items-center justify-center rounded-xl text-ink/80 transition-colors hover:bg-black/5"
            >
              {slumberMode ? <Sun size={19} /> : <MoonStar size={19} />}
            </button>
            <button
              type="button"
              aria-label="Search"
              onClick={() => setShowSearch(true)}
              className="flex size-11 items-center justify-center rounded-xl hover:bg-black/5"
            >
              <Search size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="relative flex-1 overflow-y-auto pb-28">
        {tab === "dashboard" ? (
          <DashboardTab />
        ) : tab === "graveyard" ? (
          <section className="anim-fade space-y-4 p-5 list-lane">
            <div className="graveyard-hero rounded-3xl border p-5">
              <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-brand/15 text-brand"><Archive size={22} /></div>
              <p className="capture-eyebrow">No promise disappears</p>
              <h1 className="capture-heading text-3xl">The Graveyard</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">Overdue, parked and archived reminders live here. Nothing gets erased just because a day got away from you.</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="graveyard-count">{graveyardReminders.filter((item) => !item.completed && item.time <= Date.now() && item.status !== "parked" && item.status !== "archived").length} overdue</span>
                <span className="graveyard-count">{graveyardReminders.filter((item) => item.status === "parked").length} parked</span>
                <span className="graveyard-count">{graveyardReminders.filter((item) => item.status === "archived").length} archived</span>
              </div>
            </div>
            {graveyardReminders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line p-10 text-center"><Sparkles className="mx-auto mb-3 text-moss" size={26} /><p className="font-semibold">A clean slate, for now.</p><p className="mt-1 text-sm text-mute">When a reminder slips, you can find it here without the guilt trip.</p></div>
            ) : (
              <div className="space-y-3">
                {graveyardReminders.map((item) => {
                  const label = item.status === "archived" ? "Archived" : item.status === "parked" ? "Parked" : item.completed ? "Completed" : "Overdue";
                  return (
                    <article key={item.id} className="graveyard-item flex flex-col gap-3 rounded-2xl border border-line p-4 sm:flex-row sm:items-center" style={{ backgroundColor: item.color === "#ffffff" ? "var(--color-surface)" : item.color }}>
                      <div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center gap-2"><span className="graveyard-status">{label}</span><span className="text-xs text-mute">{item.timeLabel}</span></div><p className={item.completed ? "font-medium line-through opacity-60" : "font-medium"}>{item.text}</p>{item.location && <p className="mt-1 text-xs text-mute">{item.location}</p>}</div>
                      <div className="flex flex-wrap gap-2">
                        {item.time <= Date.now() ? (
                          <button type="button" onClick={() => beginEdit(item, "reminder")} className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-moss px-3 text-sm font-semibold text-white"><Pencil size={15} /> Reschedule</button>
                        ) : (
                          <button type="button" onClick={() => changeReminderStatus(item.id, "scheduled")} className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-moss px-3 text-sm font-semibold text-white"><RotateCcw size={15} /> Bring back</button>
                        )}
                        <button type="button" onClick={() => removeItem(item.id, "reminder")} className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-line px-3 text-sm font-semibold"><Trash2 size={15} /> Delete</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : tab === "remind" ? (
          <section className="anim-fade space-y-5 p-5 capture-lane">
            <div className="capture-hero pt-3 pb-2 text-center">
              <div className={`thinking-orb ${canCompose ? "orb-awake" : ""} ${engagedChip ? "orb-catching" : ""}`} aria-hidden="true">
                <span className="orb-glint orb-glint-one" />
                <span className="orb-glint orb-glint-two" />
                <span className="orb-core"><Sparkles size={25} strokeWidth={1.7} /></span>
              </div>
              <p className="capture-eyebrow">A softer way to remember</p>
              <h1 className="capture-heading">What's on your mind?</h1>
              <p className="capture-subtitle">Leave it here. We'll bring it back at the right moment.</p>
              <p className="capture-status"><span className="status-dot" /> {slumberMode ? "Slumber Mode · quiet focus" : "Your mind, a little less crowded"}</p>
            </div>
            <AttachmentRow photo={photo} video={video} onClearPhoto={() => setPhoto(null)} onClearVideo={() => setVideo(null)} />
            <div className="flex flex-wrap gap-2">
              {REMIND_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    setEngagedChip(chip.label);
                    setInput((prev) => (prev ? `${prev} ${chip.value}` : chip.value));
                    window.setTimeout(() => setEngagedChip((active) => active === chip.label ? null : active), 520);
                  }}
                  className={`time-chip rounded-full bg-brand/10 px-3 py-2 text-xs font-semibold text-brand ${engagedChip === chip.label ? "time-chip-committing" : ""}`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={3}
              placeholder="Remind me tomorrow at 9 AM to meet at the office"
              className="capture-input w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 text-base shadow-sm outline-none focus:border-brand"
            />
            {listening && <p className="text-xs font-semibold text-blush">Listening… speak, then pause.</p>}
            <div className="capture-tools grid grid-cols-3 gap-2">
              <label className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-sm font-medium">
                <ImageIcon size={16} />
                Photo
                <input type="file" accept="image/*" className="hidden" onChange={(event) => onPhoto(event.target.files?.[0])} />
              </label>
              <button
                type="button"
                onClick={startVoice}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-medium ${listening ? "bg-blush text-white" : "bg-slate-100"}`}
              >
                <Mic size={16} />
                Voice
              </button>
              <button
                type="button"
                onClick={() => void startVideo()}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-medium ${recordingVideo ? "bg-blush text-white" : "bg-slate-100"}`}
              >
                <Video size={16} />
                {recordingVideo ? "Stop" : "Video"}
              </button>
            </div>
            {showManual ? (
              <div className="anim-up space-y-3 rounded-2xl border border-line bg-white p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Date and time</h2>
                  <button type="button" aria-label="Close" onClick={() => setShowManual(false)} className="flex size-9 items-center justify-center">
                    <X size={18} />
                  </button>
                </div>
                <label className="block text-xs font-medium text-mute">
                  Date
                  <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-slate-50 px-3 py-2.5" />
                </label>
                <label className="block text-xs font-medium text-mute">
                  Time
                  <input type="time" value={manualTime} onChange={(e) => setManualTime(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-slate-50 px-3 py-2.5" />
                </label>
                <label className="block text-xs font-medium text-mute">
                  Location
                  <input value={manualLocation} onChange={(e) => setManualLocation(e.target.value)} placeholder="Optional" className="mt-1 w-full rounded-xl border border-line bg-slate-50 px-3 py-2.5" />
                </label>
                <button type="button" onClick={addManual} disabled={!canCompose || !manualDate || !manualTime} className="h-12 w-full rounded-xl bg-brand font-semibold text-white disabled:bg-slate-300">
                  Create reminder
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => void openDraft("reminder")}
                  disabled={!canCompose || busy}
                  className="commit-button flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-white shadow-md shadow-brand/25 disabled:bg-slate-300 disabled:shadow-none"
                >
                  {busy ? <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Sparkles size={18} />}
                  {busy ? "Reading it…" : "Create reminder"}
                </button>
                <button type="button" onClick={() => setShowManual(true)} disabled={!canCompose} className="flex h-11 w-full items-center justify-center gap-1 text-sm text-mute disabled:opacity-40">
                  <Calendar size={14} />
                  or set the time yourself
                </button>
              </div>
            )}
          </section>
        ) : tab === "save" ? (
          <section className="anim-fade p-5 save-lane">
            {selectedCategory === null && (
              <div className="space-y-5">
                <div className="pt-2 text-center">
                  <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-600/25">
                    <Bookmark size={28} />
                  </div>
                  <h1 className="text-2xl font-bold">Save something</h1>
                  <p className="mt-1 text-sm text-mute">Ideas, links, places — anything.</p>
                </div>
                <AttachmentRow photo={photo} video={video} onClearPhoto={() => setPhoto(null)} onClearVideo={() => setVideo(null)} />
                <div className="flex flex-wrap gap-2">
                  {SAVE_CHIPS.map((chip) => (
                    <button key={chip.label} type="button" onClick={() => setInput(chip.prefix)} className="rounded-full bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">
                      {chip.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={3}
                  placeholder="A place in Senayan called Sate Khas"
                  className="w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 text-base shadow-sm outline-none focus:border-sky-500"
                />
                <label className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-medium">
                  <ImageIcon size={16} />
                  Add photo
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
                </label>
                <button
                  type="button"
                  disabled={!canCompose || busy}
                  onClick={() => void openDraft("save")}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 font-semibold text-white disabled:bg-slate-300"
                >
                  <Sparkles size={18} />
                  {busy ? "Sorting it…" : "Save it"}
                </button>
                <button type="button" disabled={!canCompose} onClick={() => setSelectedCategory("manual")} className="h-10 w-full text-sm text-mute disabled:opacity-40">
                  or pick a category
                </button>
                <Collections
                  categories={categories}
                  saves={saves}
                  onOpen={setSelectedCategory}
                  onAdd={() => {
                    setEditingCategoryId(null);
                    setNewCategoryName("");
                    setShowCategory(true);
                  }}
                />
              </div>
            )}

            {selectedCategory === "manual" && (
              <div className="anim-up space-y-4">
                <BackButton onClick={() => setSelectedCategory(null)} />
                <div className="text-center">
                  <h2 className="text-xl font-bold">Choose a category</h2>
                  <p className="mt-1 text-sm text-mute">Where should this live?</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {categories.map((cat) => (
                    <button key={cat.id} type="button" onClick={() => addSaveTo(cat)} className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-white p-4">
                      <span className="text-2xl">{cat.icon}</span>
                      <span className="text-xs font-medium">{cat.name}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategoryId(null);
                      setShowCategory(true);
                    }}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line p-4 text-mute"
                  >
                    <Plus size={22} />
                    <span className="text-xs font-medium">New</span>
                  </button>
                </div>
              </div>
            )}

            {selectedCategory && selectedCategory !== "manual" && (
              <CategoryView
                category={categories.find((c) => c.id === selectedCategory)}
                items={categoryItems}
                view={saveView}
                onView={setSaveView}
                onBack={() => setSelectedCategory(null)}
                onEdit={(item) => beginEdit(item, "save")}
                onDelete={(id) => removeItem(id, "save")}
                onRename={() => {
                  const cat = categories.find((c) => c.id === selectedCategory);
                  if (!cat) return;
                  setEditingCategoryId(cat.id);
                  setNewCategoryName(cat.name);
                  setNewCategoryIcon(cat.icon);
                  setShowCategory(true);
                }}
              />
            )}
          </section>
        ) : (
          <section className="anim-fade space-y-4 p-5 list-lane">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">My reminders</h2>
              <ViewToggle value={listView} onChange={setListView} />
            </div>
            {activeReminders.length === 0 ? (
              <EmptyBell onCreate={() => setTab("remind")} />
            ) : listView === "list" ? (
              <div className="space-y-3">
                {activeReminders.map((item) => (
                  <ReminderRow key={item.id} item={item} onDone={() => toggleDone(item.id)} onEdit={() => beginEdit(item, "reminder")} onDelete={() => removeItem(item.id, "reminder")} onPark={() => changeReminderStatus(item.id, "parked")} onArchive={() => changeReminderStatus(item.id, "archived")} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {activeReminders.map((item) => (
                  <ReminderCard key={item.id} item={item} onDone={() => toggleDone(item.id)} onEdit={() => beginEdit(item, "reminder")} onDelete={() => removeItem(item.id, "reminder")} onPark={() => changeReminderStatus(item.id, "parked")} onArchive={() => changeReminderStatus(item.id, "archived")} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {success && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-ink/10">
          <div className="anim-pop flex size-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
            <Check size={40} strokeWidth={3} />
          </div>
        </div>
      )}

      {draft && (
        <Sheet onClose={() => setDraft(null)} title={draft.type === "reminder" ? "Check this reminder" : "Check this save"}>
          {draft.photo && <MediaThumb src={draft.photo} kind={draft.mediaKind} className="mb-3 h-32 w-full rounded-xl object-cover" />}
          <label className="mb-3 block text-xs font-medium text-mute">
            What
            <input
              value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5"
            />
          </label>
          {draft.type === "reminder" && (
            <div className="mb-3 grid grid-cols-2 gap-3">
              <label className="text-xs font-medium text-mute">
                Date
                <input
                  type="date"
                  value={toDateInput(draft.time)}
                  onChange={(e) => {
                    const time = combineDateTime(e.target.value, hhmm(new Date(draft.time)));
                    if (!Number.isNaN(time)) setDraft({ ...draft, time, dateLabel: dateChip(time), timeLabel: hhmm(new Date(time)) });
                  }}
                  className="mt-1 w-full rounded-xl border border-line px-3 py-2.5"
                />
              </label>
              <label className="text-xs font-medium text-mute">
                Time
                <input
                  type="time"
                  value={hhmm(new Date(draft.time))}
                  onChange={(e) => {
                    const time = combineDateTime(toDateInput(draft.time), e.target.value);
                    if (!Number.isNaN(time)) setDraft({ ...draft, time, dateLabel: dateChip(time), timeLabel: e.target.value });
                  }}
                  className="mt-1 w-full rounded-xl border border-line px-3 py-2.5"
                />
              </label>
            </div>
          )}
          {draft.type === "save" && (
            <div className="mb-3">
              <p className="mb-1.5 text-xs font-medium text-mute">Category</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, categoryId: cat.id })}
                    className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${draft.categoryId === cat.id ? "bg-sky-600 text-white" : "bg-slate-100"}`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <label className="mb-4 block text-xs font-medium text-mute">
            Location
            <input
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              placeholder="Optional"
              className="mt-1 w-full rounded-xl border border-line px-3 py-2.5"
            />
          </label>
          <div className="flex gap-3">
            <button type="button" onClick={() => setDraft(null)} className="h-12 flex-1 rounded-xl bg-slate-100 font-semibold">
              Cancel
            </button>
            <button
              type="button"
              onClick={draft.type === "reminder" ? saveReminderDraft : saveItemDraft}
              className="h-12 flex-1 rounded-xl bg-brand font-semibold text-white"
            >
              Confirm
            </button>
          </div>
        </Sheet>
      )}

      {editing && (
        <div className="anim-fade absolute inset-0 z-50 flex items-center justify-center bg-ink/40 p-6">
          <div className="anim-up w-full max-w-sm rounded-3xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Edit {editing.type === "reminder" ? "reminder" : "item"}</h3>
              <button type="button" aria-label="Close" onClick={() => setEditing(null)} className="flex size-9 items-center justify-center rounded-full hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <label className="mb-3 block text-xs font-medium text-mute">
              Content
              <input value={editForm.text} onChange={(e) => setEditForm({ ...editForm, text: e.target.value })} className="mt-1 w-full rounded-xl border border-line bg-slate-50 px-3 py-2.5" />
            </label>
            <label className="mb-3 block text-xs font-medium text-mute">
              Location
              <input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="mt-1 w-full rounded-xl border border-line bg-slate-50 px-3 py-2.5" />
            </label>
            {editing.type === "reminder" && (
              <div className="mb-3 grid grid-cols-2 gap-3">
                <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="rounded-xl border border-line px-3 py-2.5" />
                <input type="time" value={editForm.time} onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} className="rounded-xl border border-line px-3 py-2.5" />
              </div>
            )}
            <div className="mb-4 flex gap-2">
              {NOTE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Color ${color}`}
                  onClick={() => setEditForm({ ...editForm, color })}
                  className={`size-8 rounded-full border-2 ${editForm.color === color ? "border-brand" : "border-line"}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditing(null)} className="h-12 flex-1 rounded-xl bg-slate-100 font-semibold">
                Cancel
              </button>
              <button type="button" onClick={commitEdit} className="h-12 flex-1 rounded-xl bg-brand font-semibold text-white">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategory && (
        <div className="anim-fade absolute inset-0 z-50 flex items-center justify-center bg-ink/40 p-6" onClick={() => setShowCategory(false)}>
          <div className="anim-up w-full max-w-sm rounded-3xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold">{editingCategoryId ? "Edit category" : "New category"}</h3>
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Travel, shopping…"
              className="mb-3 w-full rounded-xl border border-line px-3 py-2.5"
            />
            <div className="mb-4 grid grid-cols-8 gap-1">
              {CATEGORY_ICONS.map((icon) => (
                <button key={icon} type="button" onClick={() => setNewCategoryIcon(icon)} className={`rounded-lg p-1.5 text-xl ${newCategoryIcon === icon ? "bg-brand/15 ring-2 ring-brand" : ""}`}>
                  {icon}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {editingCategoryId && categories.find((c) => c.id === editingCategoryId)?.custom && (
                <button
                  type="button"
                  onClick={() => {
                    removeCategory(editingCategoryId);
                    setShowCategory(false);
                  }}
                  className="h-12 flex-1 rounded-xl bg-blush/10 font-semibold text-blush"
                >
                  Delete
                </button>
              )}
              <button type="button" onClick={commitCategory} disabled={!newCategoryName.trim()} className="h-12 flex-1 rounded-xl bg-brand font-semibold text-white disabled:bg-slate-300">
                {editingCategoryId ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSearch && (
        <div className="anim-fade absolute inset-0 z-50 overflow-y-auto bg-white p-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-mute" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search reminders and saves"
                className="h-12 w-full rounded-xl bg-slate-100 pr-3 pl-9 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setShowSearch(false);
                setQuery("");
              }}
              className="px-2 font-semibold text-brand"
            >
              Cancel
            </button>
          </div>
          {!query.trim() ? (
            <p className="py-16 text-center text-sm text-mute">Search what you've saved.</p>
          ) : (
            <div className="space-y-4">
              <SearchGroup
                title="Reminders"
                empty={filteredReminders.length === 0}
                items={filteredReminders.map((item) => ({
                  id: item.id,
                  title: item.text,
                  meta: item.timeLabel,
                  onOpen: () => {
                    setShowSearch(false);
                    setQuery("");
                    setTab("reminder");
                  },
                }))}
              />
              <SearchGroup
                title="Saved"
                empty={filteredSaves.length === 0}
                items={filteredSaves.map((item) => ({
                  id: item.id,
                  title: item.text,
                  meta: categories.find((c) => c.id === item.category)?.name ?? "Saved",
                  onOpen: () => {
                    setShowSearch(false);
                    setQuery("");
                    setTab("save");
                    setSelectedCategory(item.category);
                  },
                }))}
              />
              {filteredReminders.length === 0 && filteredSaves.length === 0 && <p className="py-10 text-center text-sm text-mute">Nothing matches.</p>}
            </div>
          )}
        </div>
      )}

      {showMenu && (
        <div className="absolute inset-0 z-50 flex" onClick={() => setShowMenu(false)}>
          <div className="anim-drawer relative flex h-full w-72 flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-line p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-full bg-brand text-white">
                  <User size={22} />
                </span>
                <div>
                  <p className="font-semibold">{profile?.name ?? "Guest"}</p>
                  <p className="text-xs text-mute">{profile ? "On this device" : "No name yet"}</p>
                </div>
              </div>
            </div>
            <div className="p-3">
              <MenuRow icon={<User size={18} />} label="Profile" onClick={() => { setShowMenu(false); setShowProfile(true); }} />
              <MenuRow icon={<Settings size={18} />} label="Settings" onClick={() => { setShowMenu(false); setShowSettings(true); }} />
              <MenuRow icon={<HelpCircle size={18} />} label="How to write" onClick={() => { setShowMenu(false); setShowHelp(true); }} />
            </div>
            <div className="mt-auto grid grid-cols-2 gap-3 border-t border-line p-5 text-center">
              <div>
                <p className="text-2xl font-bold text-brand">{reminders.length}</p>
                <p className="text-xs text-mute">Reminders</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-sky-600">{saves.length}</p>
                <p className="text-xs text-mute">Saved</p>
              </div>
            </div>
          </div>
          <div className="flex-1 bg-ink/30" />
        </div>
      )}

      {showProfile && (
        <SidePage title="Profile" onBack={() => setShowProfile(false)}>
          <div className="py-6 text-center">
            <span className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-brand text-white">
              <User size={36} />
            </span>
            {profile ? (
              <>
                <p className="text-xl font-bold">{profile.name}</p>
                <p className="mt-1 text-sm text-mute">Stored only on this device</p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold">What should we call you?</p>
                <p className="mt-1 mb-4 text-sm text-mute">Just a name. Nothing leaves this device.</p>
                <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="Your name" className="mb-3 w-full rounded-xl border border-line px-3 py-3" />
                <button type="button" onClick={signIn} disabled={!nameDraft.trim()} className="h-12 rounded-full bg-brand px-8 font-semibold text-white disabled:bg-slate-300">
                  Save name
                </button>
              </>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat n={reminders.length} label="Reminders" />
            <Stat n={saves.length} label="Saved" />
            <Stat n={categories.length} label="Categories" />
          </div>
          {profile && (
            <button type="button" onClick={signOut} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blush/10 font-semibold text-blush">
              <LogOut size={18} />
              Clear name
            </button>
          )}
        </SidePage>
      )}

      {showSettings && (
        <SidePage title="Settings" onBack={() => setShowSettings(false)}>
          <button type="button" onClick={() => void askNotify()} className="flex h-14 w-full items-center justify-between rounded-2xl bg-white px-4 text-left shadow-sm">
            <span>
              <span className="block font-semibold">Notifications</span>
              <span className="text-xs text-mute">{notifyOn ? "On for this browser" : "Off — tap to allow"}</span>
            </span>
            <Bell size={18} className={notifyOn ? "text-brand" : "text-mute"} />
          </button>
          <p className="mt-4 text-sm leading-relaxed text-mute">
            Reminders and saves stay in this browser. They are not uploaded, and clearing site data removes them.
          </p>
          <button type="button" onClick={wipe} className="mt-6 h-12 w-full rounded-2xl bg-blush/10 font-semibold text-blush">
            Clear all data
          </button>
        </SidePage>
      )}

      {showHelp && (
        <SidePage title="How to write" onBack={() => setShowHelp(false)}>
          <HelpLine title="Tomorrow morning" body="Remind me tomorrow at 8 AM to take vitamins" />
          <HelpLine title="In an hour" body="Remind me in 1 hour to pick up the children" />
          <HelpLine title="With a place" body="Remind me tomorrow at 9 AM to meet at the office" />
          <HelpLine title="A place to keep" body="A place in Senayan called Sate Khas" />
          <HelpLine title="A link" body="save link https://example.com" />
          <p className="mt-4 text-sm text-mute">You'll always get a check screen before anything is saved, so a wrong time is easy to fix.</p>
        </SidePage>
      )}

      {toast && (
        <div className="anim-up absolute right-4 bottom-24 left-4 z-40">
          <div className="flex items-center justify-between rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-lg">
            <span>{toast.message}</span>
            {toast.undo && (
              <button type="button" onClick={undo} className="ml-3 font-semibold text-white/80">
                Undo
              </button>
            )}
          </div>
        </div>
      )}

      <nav className="absolute right-4 bottom-4 left-4 z-30">
        <div className="flex rounded-2xl border border-line bg-white/95 p-1.5 shadow-lg shadow-slate-300/50 backdrop-blur">
          <NavButton active={tab === "reminder"} onClick={() => switchTab("reminder")} icon={<Bell size={17} fill={tab === "reminder" ? "currentColor" : "none"} />} label="List" />
          <NavButton active={tab === "remind"} onClick={() => switchTab("remind")} icon={<Plus size={17} />} label="Remind" />
          <NavButton active={tab === "graveyard"} onClick={() => switchTab("graveyard")} icon={<Archive size={17} />} label="Graveyard" />
          <NavButton active={tab === "save"} onClick={() => switchTab("save")} icon={<Bookmark size={17} fill={tab === "save" ? "currentColor" : "none"} />} label="Save" />
          <NavButton active={tab === "dashboard"} onClick={() => switchTab("dashboard")} icon={<LayoutGrid size={17} />} label="Memory" />
        </div>
      </nav>
    </div>
  );
}

function AttachmentRow({
  photo,
  video,
  onClearPhoto,
  onClearVideo,
}: {
  photo: string | null;
  video: string | null;
  onClearPhoto: () => void;
  onClearVideo: () => void;
}) {
  if (!photo && !video) return null;
  return (
    <div className="flex gap-3">
      {photo && (
        <div className="relative">
          <img src={photo} alt="Attached" className="size-20 rounded-xl object-cover" />
          <button type="button" aria-label="Remove photo" onClick={onClearPhoto} className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-blush text-white">
            <X size={12} />
          </button>
        </div>
      )}
      {video && (
        <div className="relative">
          <video src={video} className="size-20 rounded-xl object-cover" muted />
          <button type="button" aria-label="Remove video" onClick={onClearVideo} className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-blush text-white">
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1 text-sm font-medium text-mute">
      <ChevronLeft size={16} />
      Back
    </button>
  );
}

function ViewToggle({ value, onChange }: { value: "list" | "card"; onChange: (v: "list" | "card") => void }) {
  return (
    <div className="flex rounded-lg bg-slate-100 p-1">
      {(["list", "card"] as const).map((mode) => (
        <button key={mode} type="button" onClick={() => onChange(mode)} className={`rounded-md px-3 py-1 text-xs font-semibold capitalize ${value === mode ? "bg-white shadow-sm" : "text-mute"}`}>
          {mode}
        </button>
      ))}
    </div>
  );
}

function Collections({
  categories,
  saves,
  onOpen,
  onAdd,
}: {
  categories: Category[];
  saves: SaveItem[];
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  if (saves.length === 0) {
    return <p className="py-6 text-center text-sm text-mute">Saved things will collect here.</p>;
  }
  return (
    <div className="pt-2">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Collections</h3>
        <button type="button" onClick={onAdd} className="flex items-center gap-1 text-xs font-semibold text-brand">
          <Plus size={14} />
          Category
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat) => {
          const count = saves.filter((item) => item.category === cat.id).length;
          if (!count) return null;
          return (
            <button key={cat.id} type="button" onClick={() => onOpen(cat.id)} className="rounded-2xl border border-line bg-white p-4 text-left">
              <div className="mb-2 text-2xl">{cat.icon}</div>
              <div className="text-sm font-semibold">{cat.name}</div>
              <div className="text-xs text-mute">{count} item{count === 1 ? "" : "s"}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CategoryView({
  category,
  items,
  view,
  onView,
  onBack,
  onEdit,
  onDelete,
  onRename,
}: {
  category?: Category;
  items: SaveItem[];
  view: "list" | "card";
  onView: (v: "list" | "card") => void;
  onBack: () => void;
  onEdit: (item: SaveItem) => void;
  onDelete: (id: number) => void;
  onRename: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <BackButton onClick={onBack} />
        <ViewToggle value={view} onChange={onView} />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{category?.icon}</span>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{category?.name ?? "Saved"}</h2>
          <p className="text-sm text-mute">{items.length} item{items.length === 1 ? "" : "s"}</p>
        </div>
        <button type="button" aria-label="Edit category" onClick={onRename} className="flex size-10 items-center justify-center rounded-xl bg-slate-100">
          <Pencil size={16} />
        </button>
      </div>
      {items.length === 0 && <p className="py-10 text-center text-sm text-mute">Nothing in here yet.</p>}
      {view === "list" ? (
        <div className="space-y-3">
          {items.map((item) => (
            <SaveRow key={item.id} item={item} onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-line" style={{ backgroundColor: item.color }}>
              {item.photo && <MediaThumb src={item.photo} kind={item.mediaKind} className="h-24 w-full object-cover" />}
              <div className="p-3">
                <p className="line-clamp-3 text-sm font-medium">{item.text}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-mute">{getTimeAgo(item.created)}</span>
                  <span className="flex gap-1">
                    <IconBtn label="Edit" onClick={() => onEdit(item)}><Pencil size={12} /></IconBtn>
                    <IconBtn label="Delete" onClick={() => onDelete(item.id)}><Trash2 size={12} /></IconBtn>
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function SaveRow({ item, onEdit, onDelete }: { item: SaveItem; onEdit: () => void; onDelete: () => void }) {
  const url = firstUrl(item.text);
  return (
    <article className="flex gap-3 rounded-2xl border border-line bg-white p-4" style={{ backgroundColor: item.color === "#ffffff" ? undefined : item.color }}>
      {item.photo && <MediaThumb src={item.photo} kind={item.mediaKind} className="size-14 shrink-0 rounded-xl object-cover" />}
      <div className="min-w-0 flex-1">
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="block">
            <p className="text-xs font-medium text-sky-700">{hostnameOf(url)}</p>
            <p className="line-clamp-2 text-sm">{item.text}</p>
          </a>
        ) : (
          <p className="font-medium">{item.text}</p>
        )}
        {item.location && (
          <a className="mt-2 inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`} target="_blank" rel="noreferrer">
            <MapPin size={12} />
            {item.location}
          </a>
        )}
        <p className="mt-2 text-xs text-mute">{getTimeAgo(item.created)}</p>
      </div>
      <div className="flex flex-col gap-1">
        <IconBtn label="Edit" onClick={onEdit}><Pencil size={14} /></IconBtn>
        <IconBtn label="Delete" onClick={onDelete}><Trash2 size={14} /></IconBtn>
      </div>
    </article>
  );
}

function ReminderRow({ item, onDone, onEdit, onDelete, onPark, onArchive }: { item: Reminder; onDone: () => void; onEdit: () => void; onDelete: () => void; onPark: () => void; onArchive: () => void }) {
  return (
    <article className={`flex gap-3 rounded-2xl border border-line p-4 ${item.completed ? "opacity-60" : ""}`} style={{ backgroundColor: item.color === "#ffffff" ? "#fff" : item.color }}>
      {item.photo && <MediaThumb src={item.photo} kind={item.mediaKind} className="size-14 shrink-0 rounded-xl object-cover" />}
      <div className="min-w-0 flex-1">
        <p className={`font-medium ${item.completed ? "text-mute line-through" : ""}`}>{item.text}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">
            <Clock size={12} />
            {item.timeLabel}
          </span>
          {item.location && (
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-xs text-sky-700">
              <MapPin size={12} />
              {item.location}
            </a>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <button type="button" aria-label={item.completed ? "Mark not done" : "Mark done"} onClick={onDone} className={`flex size-9 items-center justify-center rounded-lg ${item.completed ? "bg-emerald-500 text-white" : "bg-slate-100"}`}>
          <Check size={16} />
        </button>
        <IconBtn label="Edit" onClick={onEdit}><Pencil size={14} /></IconBtn>
        <IconBtn label="Park reminder" onClick={onPark}><PauseCircle size={14} /></IconBtn>
        <IconBtn label="Archive reminder" onClick={onArchive}><Archive size={14} /></IconBtn>
        <IconBtn label="Delete" onClick={onDelete}><Trash2 size={14} /></IconBtn>
      </div>
    </article>
  );
}

function ReminderCard({ item, onDone, onEdit, onDelete, onPark, onArchive }: { item: Reminder; onDone: () => void; onEdit: () => void; onDelete: () => void; onPark: () => void; onArchive: () => void }) {
  return (
    <article className={`overflow-hidden rounded-2xl border border-line ${item.completed ? "opacity-60" : ""}`} style={{ backgroundColor: item.color === "#ffffff" ? "#fff" : item.color }}>
      {item.photo && <MediaThumb src={item.photo} kind={item.mediaKind} className="h-24 w-full object-cover" />}
      <div className="p-3">
        <div className="mb-2 flex justify-end">
          <button type="button" aria-label="Toggle done" onClick={onDone} className={`flex size-7 items-center justify-center rounded-lg ${item.completed ? "bg-emerald-500 text-white" : "bg-slate-100"}`}>
            <Check size={12} />
          </button>
        </div>
        <p className={`line-clamp-2 text-sm font-medium ${item.completed ? "line-through" : ""}`}>{item.text}</p>
        <p className="mt-2 flex items-center gap-1 text-xs text-mute">
          <Clock size={10} />
          <span className="truncate">{item.timeLabel}</span>
        </p>
        <div className="mt-2 flex gap-1 border-t border-line pt-2">
          <IconBtn label="Edit" onClick={onEdit}><Pencil size={12} /></IconBtn>
          <IconBtn label="Park reminder" onClick={onPark}><PauseCircle size={12} /></IconBtn>
          <IconBtn label="Archive reminder" onClick={onArchive}><Archive size={12} /></IconBtn>
          <IconBtn label="Delete" onClick={onDelete}><Trash2 size={12} /></IconBtn>
        </div>
      </div>
    </article>
  );
}

function EmptyBell({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-3xl bg-brand/10 text-brand">
        <Bell size={32} />
      </div>
      <h3 className="text-lg font-semibold">No reminders yet</h3>
      <p className="mt-1 mb-4 text-sm text-mute">The first one can be a sentence.</p>
      <button type="button" onClick={onCreate} className="h-11 rounded-xl bg-brand px-5 font-semibold text-white">
        Create reminder
      </button>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
      {children}
    </button>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="anim-fade absolute inset-0 z-50 flex items-end bg-ink/40" onClick={onClose}>
      <div className="anim-sheet max-h-[88%] w-full overflow-y-auto rounded-t-3xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-slate-200" />
        <h3 className="mb-4 text-center text-lg font-bold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function MenuRow({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-slate-50">
      <span className="text-mute">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function SidePage({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <div className="anim-fade absolute inset-0 z-40 overflow-y-auto bg-paper pb-28">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-white/90 px-3 py-3 backdrop-blur">
        <button type="button" aria-label="Back" onClick={onBack} className="flex size-10 items-center justify-center rounded-full hover:bg-slate-100">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
      <p className="text-2xl font-bold text-brand">{n}</p>
      <p className="mt-1 text-xs text-mute">{label}</p>
    </div>
  );
}

function HelpLine({ title, body }: { title: string; body: string }) {
  return (
    <div className="mb-3 rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm text-mute">{body}</p>
    </div>
  );
}

function SearchGroup({
  title,
  items,
  empty,
}: {
  title: string;
  empty: boolean;
  items: { id: number; title: string; meta: string; onOpen: () => void }[];
}) {
  if (empty) return null;
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-mute uppercase">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <button key={item.id} type="button" onClick={item.onOpen} className="w-full rounded-xl bg-slate-50 p-3 text-left">
            <p className="line-clamp-2 font-medium">{item.title}</p>
            <p className="mt-1 text-xs text-mute">{item.meta}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className={`flex h-12 flex-1 items-center justify-center gap-1 rounded-xl text-[10px] font-semibold sm:gap-2 sm:text-xs ${active ? "bg-brand text-white" : "text-mute"}`}>
      {icon}
      {label}
    </button>
  );
}

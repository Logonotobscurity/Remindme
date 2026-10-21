import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { S as Bell, _ as CircleHelp, a as Trash2, b as Calendar, c as Search, d as Mic, f as Menu, g as Clock, h as Image, l as Plus, m as LogOut, n as Video, o as Sparkles, p as MapPin, r as User, s as Settings, t as X, u as Pencil, v as ChevronLeft, x as Bookmark, y as Check } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-H7VpDSnz.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var NOTE_COLORS = [
	"#ffffff",
	"#fef3c7",
	"#dbeafe",
	"#dcfce7",
	"#fce7f3",
	"#f3e8ff"
];
var CATEGORY_ICONS = [
	"💡",
	"📝",
	"🔗",
	"📍",
	"📷",
	"💼",
	"🛒",
	"✈️",
	"🎯",
	"⭐",
	"❤️",
	"🎨",
	"🎵",
	"📱",
	"💻",
	"🏠"
];
var DEFAULT_CATEGORIES = [
	{
		id: "ideas",
		name: "Ideas",
		icon: "💡",
		color: "#FEF3C7"
	},
	{
		id: "tasks",
		name: "Tasks",
		icon: "✓",
		color: "#DBEAFE"
	},
	{
		id: "links",
		name: "Links",
		icon: "🔗",
		color: "#E0E7FF"
	},
	{
		id: "notes",
		name: "Notes",
		icon: "📝",
		color: "#FCE7F3"
	},
	{
		id: "photos",
		name: "Photos",
		icon: "📷",
		color: "#D1FAE5"
	},
	{
		id: "place",
		name: "Place",
		icon: "📍",
		color: "#FED7AA"
	},
	{
		id: "other",
		name: "Other",
		icon: "📌",
		color: "#E5E7EB"
	}
];
var KEYS = {
	reminders: "remindme.reminders",
	saves: "remindme.saves",
	categories: "remindme.categories",
	profile: "remindme.profile"
};
function readJson(key, fallback) {
	if (typeof window === "undefined") return fallback;
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return fallback;
		return JSON.parse(raw);
	} catch {
		return fallback;
	}
}
function writeJson(key, value) {
	if (typeof window === "undefined") return;
	localStorage.setItem(key, JSON.stringify(value));
}
function loadReminders() {
	return readJson(KEYS.reminders, []).map((item) => ({
		...item,
		mediaKind: item.mediaKind ?? inferKind(item.photo),
		completed: Boolean(item.completed),
		location: item.location ?? null
	}));
}
function loadSaves() {
	return readJson(KEYS.saves, []).map((item) => ({
		...item,
		mediaKind: item.mediaKind ?? inferKind(item.photo),
		location: item.location ?? null
	}));
}
function loadCategories() {
	const stored = readJson(KEYS.categories, null);
	if (!stored?.length) return DEFAULT_CATEGORIES;
	return stored;
}
function loadProfile() {
	return readJson(KEYS.profile, null);
}
function persistReminders(items) {
	writeJson(KEYS.reminders, items);
}
function persistSaves(items) {
	writeJson(KEYS.saves, items);
}
function persistCategories(items) {
	writeJson(KEYS.categories, items);
}
function persistProfile(profile) {
	if (!profile) localStorage.removeItem(KEYS.profile);
	else writeJson(KEYS.profile, profile);
}
function clearAllData() {
	if (typeof window === "undefined") return;
	Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
}
function inferKind(photo) {
	if (!photo) return null;
	if (photo.startsWith("data:video")) return "video";
	return "image";
}
function pad(n) {
	return String(n).padStart(2, "0");
}
function hhmm(date) {
	return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function toDateInput(ts) {
	const date = new Date(ts);
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
var MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec"
];
function formatTimeLabel(ts) {
	const date = new Date(ts);
	return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} at ${hhmm(date)}`;
}
function dateChip(ts, now = /* @__PURE__ */ new Date()) {
	const date = new Date(ts);
	const start = new Date(now);
	start.setHours(0, 0, 0, 0);
	const target = new Date(date);
	target.setHours(0, 0, 0, 0);
	const diff = Math.round((target.getTime() - start.getTime()) / 864e5);
	if (diff === 0) return "Hari ini";
	if (diff === 1) return "Besok";
	if (diff === 2) return "Lusa";
	return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}
function titleCase(value) {
	return value.split(/\s+/).filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
function getTimeAgo(created) {
	const diffMs = Date.now() - created;
	const diffMins = Math.floor(diffMs / 6e4);
	const diffHours = Math.floor(diffMs / 36e5);
	const diffDays = Math.floor(diffMs / 864e5);
	if (diffMins < 1) return "just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;
	const date = new Date(created);
	return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}
function combineDateTime(dateStr, timeStr) {
	return (/* @__PURE__ */ new Date(`${dateStr}T${timeStr}`)).getTime();
}
function applyMeridiem(hour, mer) {
	const tag = mer.toLowerCase();
	if ((tag === "pm" || tag === "sore" || tag === "malam" || tag === "malem") && hour < 12) return hour + 12;
	if ((tag === "am" || tag === "pagi") && hour === 12) return 0;
	if (tag === "siang" && hour < 11) return hour + 12;
	return hour;
}
function parseReminder(inputText, photo, mediaKind) {
	const original = inputText.trim();
	const text = original.toLowerCase();
	const now = /* @__PURE__ */ new Date();
	let date = new Date(now);
	let dateLabel = "Hari ini";
	if (/\b(besok|tomorrow)\b/.test(text)) {
		date.setDate(date.getDate() + 1);
		dateLabel = "Besok";
	} else if (/\blusa\b/.test(text)) {
		date.setDate(date.getDate() + 2);
		dateLabel = "Lusa";
	} else if (/\b(minggu depan|next week)\b/.test(text)) {
		date.setDate(date.getDate() + 7);
		dateLabel = "Minggu depan";
	}
	let hour = 9;
	let minute = 0;
	const relative = text.match(/\b(?:dalam|in)\s*(\d+)\s*(jam|menit|hours?|minutes?|mins?)\b/);
	if (relative) {
		const amount = parseInt(relative[1], 10);
		const unit = relative[2];
		const ms = unit.startsWith("men") || unit.startsWith("min") ? amount * 6e4 : amount * 36e5;
		date = new Date(now.getTime() + ms);
		hour = date.getHours();
		minute = date.getMinutes();
		dateLabel = dateChip(date.getTime(), now);
	} else {
		const jam = text.match(/\b(?:jam|pukul|at)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|pagi|siang|sore|malam|malem)?\b/);
		const clock = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
		if (jam) {
			hour = applyMeridiem(parseInt(jam[1], 10), jam[3] || "");
			minute = jam[2] ? parseInt(jam[2], 10) : 0;
			if (!jam[3]) {
				if (/\b(sore|afternoon)\b/.test(text) && hour < 12) hour += 12;
				else if (/\b(malam|malem|evening|tonight)\b/.test(text) && hour < 12) hour += 12;
				else if (/\b(siang)\b/.test(text) && hour < 11) hour += 12;
			}
		} else if (clock) {
			hour = applyMeridiem(parseInt(clock[1], 10), clock[3]);
			minute = clock[2] ? parseInt(clock[2], 10) : 0;
		} else if (/\b(pagi|morning)\b/.test(text)) hour = 8;
		else if (/\b(siang|noon)\b/.test(text)) hour = 12;
		else if (/\b(sore|afternoon)\b/.test(text)) hour = 17;
		else if (/\b(malam|malem|tonight|evening)\b/.test(text)) hour = 20;
		hour = Math.min(23, Math.max(0, hour));
		minute = Math.min(59, Math.max(0, minute));
		date.setHours(hour, minute, 0, 0);
		if (date.getTime() < now.getTime() - 3e4 && dateLabel === "Hari ini") {
			date.setDate(date.getDate() + 1);
			dateLabel = "Besok";
		}
	}
	let location = "";
	const loc = original.match(/\b(?:di|at)\s+([A-Za-z0-9][A-Za-z0-9\s.'-]{1,40}?)(?=\s+(?:jam|pukul|pagi|siang|sore|malam|malem|besok|lusa|tomorrow|at|sama|bareng|dengan|namanya|yang|untuk|to)\b|[.,]|$)/i);
	if (loc) {
		const raw = loc[1].trim();
		if (raw && !/^(aku|me|sini|here|sana)$/i.test(raw)) location = titleCase(raw);
	}
	let clean = original;
	for (const prefix of [
		"ingetin aku",
		"ingatkan aku",
		"tolong ingetin",
		"remind me to",
		"remind me",
		"ingetin",
		"ingatkan",
		"reminder"
	]) if (clean.toLowerCase().startsWith(prefix)) {
		clean = clean.slice(prefix.length).trim();
		break;
	}
	clean = clean.replace(/\b(besok|lusa|minggu depan|hari ini|nanti|tomorrow|next week|tonight)\b/gi, "").replace(/\b(?:jam|pukul|at)\s*\d{1,2}(?:[:.]\d{2})?\s*(am|pm|pagi|siang|sore|malam|malem)?\b/gi, "").replace(/\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/gi, "").replace(/\b(?:dalam|in)\s*\d+\s*(jam|menit|hours?|minutes?|mins?)\b/gi, "").replace(/\b(pagi|siang|sore|malam|malem|morning|afternoon|evening)\b/gi, "");
	if (location) clean = clean.replace(new RegExp(`\\b(?:di|at)\\s+${location}\\b`, "gi"), "");
	clean = clean.replace(/\s+/g, " ").replace(/^[\s,.-]+|[\s,.-]+$/g, "").trim();
	if (clean) clean = clean.charAt(0).toUpperCase() + clean.slice(1);
	if (!clean) {
		if (mediaKind === "video") clean = "Video reminder";
		else if (photo) clean = "Photo reminder";
		else clean = "Reminder";
	}
	return {
		type: "reminder",
		text: clean,
		time: date.getTime(),
		dateLabel,
		timeLabel: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
		location,
		photo,
		mediaKind
	};
}
var SAVE_CONTEXTS = [
	{
		pattern: /tempat\s*liburan|destinasi|vacation|holiday|wisata|travel/i,
		categoryId: "place"
	},
	{
		pattern: /tempat\s*makan|resto|restaurant|kuliner|food/i,
		categoryId: "place"
	},
	{
		pattern: /tempat\s*nongkrong|cafe|coffee|ngopi/i,
		categoryId: "place"
	},
	{
		pattern: /inspirasi|design|desain|referensi|idea|ide\b/i,
		categoryId: "ideas"
	},
	{
		pattern: /catatan|note/i,
		categoryId: "notes"
	},
	{
		pattern: /musik|music|song|lagu|playlist/i,
		categoryId: "other"
	},
	{
		pattern: /film|movie|series|nonton/i,
		categoryId: "other"
	},
	{
		pattern: /buku|book|baca|read/i,
		categoryId: "other"
	}
];
function parseSave(inputText, photo, mediaKind) {
	const original = inputText.trim();
	const text = original.toLowerCase();
	let categoryId = "other";
	let clean = original;
	let location = "";
	const urlMatch = original.match(/https?:\/\/[^\s]+/i);
	const namedPlace = original.match(/(?:lokasi|tempat)\s*(?:ngedate|makan|hangout|ngopi|date)?\s*(?:di\s+)?([a-z0-9][a-z0-9\s.'-]{0,30}?)\s+namanya\s+([a-z0-9][a-z0-9\s&'.-]{0,40})/i);
	if (namedPlace) {
		location = titleCase(namedPlace[1].trim());
		clean = titleCase(namedPlace[2].trim());
		categoryId = "place";
	} else if (urlMatch) {
		categoryId = "links";
		const before = original.slice(0, original.indexOf(urlMatch[0])).replace(/^(save|simpan)\s*/i, "").replace(/[:\s]+$/g, "").trim();
		clean = before ? `${before}\n${urlMatch[0]}` : urlMatch[0];
	} else {
		for (const ctx of SAVE_CONTEXTS) if (ctx.pattern.test(text)) {
			categoryId = ctx.categoryId;
			break;
		}
		if (/\b(lokasi|tempat|place)\b/i.test(text)) categoryId = "place";
		if (!original && (photo || mediaKind)) categoryId = "photos";
		else if ((photo || mediaKind) && categoryId === "other") categoryId = "photos";
		clean = original.replace(/^(save|simpan|ide|idea|catatan|note|lokasi)\s*[:\-]?\s*/i, "").trim();
		const loc = clean.match(/\b(?:di|at)\s+([A-Za-z0-9][A-Za-z0-9\s.'-]{1,40})$/i);
		if (loc && categoryId === "place") location = titleCase(loc[1].trim());
	}
	if (clean && !clean.startsWith("http")) clean = clean.charAt(0).toUpperCase() + clean.slice(1);
	if (!clean) clean = mediaKind === "video" ? "Video" : photo ? "Photo" : "Saved item";
	return {
		type: "save",
		text: clean,
		location,
		categoryId,
		photo,
		mediaKind
	};
}
function hostnameOf(url) {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return "Link";
	}
}
function firstUrl(text) {
	return text.match(/https?:\/\/[^\s]+/)?.[0] ?? null;
}
function getSpeechCtor() {
	if (typeof window === "undefined") return null;
	const w = window;
	return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}
var REMIND_CHIPS = [
	{
		label: "Besok pagi",
		value: "besok jam 8 pagi "
	},
	{
		label: "Nanti sore",
		value: "hari ini jam 5 sore "
	},
	{
		label: "Minggu depan",
		value: "minggu depan jam 9 "
	},
	{
		label: "1 jam lagi",
		value: "dalam 1 jam "
	}
];
var SAVE_CHIPS = [
	{
		label: "Ide",
		prefix: "ide: "
	},
	{
		label: "Tempat",
		prefix: "lokasi di "
	},
	{
		label: "Link",
		prefix: "save link "
	},
	{
		label: "Catatan",
		prefix: "catatan: "
	}
];
function MediaThumb({ src, kind, className }) {
	if (kind === "video") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
		src,
		className,
		muted: true,
		playsInline: true
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		src,
		alt: "",
		className
	});
}
function RemindApp() {
	const [ready, setReady] = (0, import_react.useState)(false);
	const [tab, setTab] = (0, import_react.useState)("remind");
	const [input, setInput] = (0, import_react.useState)("");
	const [reminders, setReminders] = (0, import_react.useState)([]);
	const [saves, setSaves] = (0, import_react.useState)([]);
	const [categories, setCategories] = (0, import_react.useState)(DEFAULT_CATEGORIES);
	const [profile, setProfile] = (0, import_react.useState)(null);
	const [photo, setPhoto] = (0, import_react.useState)(null);
	const [video, setVideo] = (0, import_react.useState)(null);
	const [showManual, setShowManual] = (0, import_react.useState)(false);
	const [manualDate, setManualDate] = (0, import_react.useState)("");
	const [manualTime, setManualTime] = (0, import_react.useState)("");
	const [manualLocation, setManualLocation] = (0, import_react.useState)("");
	const [selectedCategory, setSelectedCategory] = (0, import_react.useState)(null);
	const [saveView, setSaveView] = (0, import_react.useState)("list");
	const [listView, setListView] = (0, import_react.useState)("list");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [listening, setListening] = (0, import_react.useState)(false);
	const [recordingVideo, setRecordingVideo] = (0, import_react.useState)(false);
	const [draft, setDraft] = (0, import_react.useState)(null);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [editForm, setEditForm] = (0, import_react.useState)({
		text: "",
		location: "",
		date: "",
		time: "",
		color: "#ffffff"
	});
	const [showCategory, setShowCategory] = (0, import_react.useState)(false);
	const [editingCategoryId, setEditingCategoryId] = (0, import_react.useState)(null);
	const [newCategoryName, setNewCategoryName] = (0, import_react.useState)("");
	const [newCategoryIcon, setNewCategoryIcon] = (0, import_react.useState)("📌");
	const [showSearch, setShowSearch] = (0, import_react.useState)(false);
	const [query, setQuery] = (0, import_react.useState)("");
	const [showMenu, setShowMenu] = (0, import_react.useState)(false);
	const [showProfile, setShowProfile] = (0, import_react.useState)(false);
	const [showSettings, setShowSettings] = (0, import_react.useState)(false);
	const [showHelp, setShowHelp] = (0, import_react.useState)(false);
	const [nameDraft, setNameDraft] = (0, import_react.useState)("");
	const [toast, setToast] = (0, import_react.useState)(null);
	const [success, setSuccess] = (0, import_react.useState)(false);
	const [notifyOn, setNotifyOn] = (0, import_react.useState)(false);
	const remindersRef = (0, import_react.useRef)(reminders);
	const recorderRef = (0, import_react.useRef)(null);
	const streamRef = (0, import_react.useRef)(null);
	const speechRef = (0, import_react.useRef)(null);
	remindersRef.current = reminders;
	(0, import_react.useEffect)(() => {
		setReminders(loadReminders());
		setSaves(loadSaves());
		setCategories(loadCategories());
		const stored = loadProfile();
		setProfile(stored);
		setNameDraft(stored?.name ?? "");
		setNotifyOn(typeof Notification !== "undefined" && Notification.permission === "granted");
		setReady(true);
	}, []);
	(0, import_react.useEffect)(() => {
		const tick = () => {
			const now = Date.now();
			const current = remindersRef.current;
			let changed = false;
			const next = current.map((item) => {
				if (!item.notified && !item.completed && item.time <= now) {
					changed = true;
					if (typeof Notification !== "undefined" && Notification.permission === "granted") try {
						new Notification("Re:Mind Me", { body: item.text });
					} catch {}
					return {
						...item,
						notified: true
					};
				}
				return item;
			});
			if (changed) {
				setReminders(next);
				persistReminders(next);
			}
		};
		tick();
		const id = window.setInterval(tick, 3e4);
		return () => window.clearInterval(id);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!toast) return;
		const id = window.setTimeout(() => setToast(null), 4e3);
		return () => window.clearTimeout(id);
	}, [toast]);
	const flash = (message, undo) => {
		setToast({
			message,
			undo
		});
	};
	const popSuccess = () => {
		setSuccess(true);
		window.setTimeout(() => setSuccess(false), 900);
	};
	const attachment = () => {
		if (video) return {
			photo: video,
			mediaKind: "video"
		};
		if (photo) return {
			photo,
			mediaKind: "image"
		};
		return {
			photo: null,
			mediaKind: null
		};
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
	const switchTab = (next) => {
		setTab(next);
		resetComposer();
		if (next === "save") setSelectedCategory(null);
	};
	const onPhoto = (file) => {
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
			const text = Array.from(event.results).map((row) => row[0]?.transcript ?? "").join(" ").trim();
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
			const stream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: true
			});
			streamRef.current = stream;
			const recorder = new MediaRecorder(stream);
			const chunks = [];
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
			}, 2e4);
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
	const openDraft = async (kind) => {
		const media = attachment();
		if (!input.trim() && !media.photo) return;
		setBusy(true);
		await new Promise((resolve) => window.setTimeout(resolve, 220));
		const next = kind === "reminder" ? parseReminder(input, media.photo, media.mediaKind) : parseSave(input, media.photo, media.mediaKind);
		setDraft(next);
		setBusy(false);
	};
	const saveReminderDraft = () => {
		if (!draft || draft.type !== "reminder") return;
		const next = [{
			id: Date.now(),
			text: draft.text.trim() || "Reminder",
			photo: draft.photo,
			mediaKind: draft.mediaKind,
			time: draft.time,
			timeLabel: formatTimeLabel(draft.time),
			location: draft.location.trim() || null,
			notified: false,
			completed: false,
			created: Date.now(),
			color: "#ffffff"
		}, ...reminders];
		setReminders(next);
		persistReminders(next);
		setDraft(null);
		resetComposer();
		popSuccess();
		flash("Reminder saved");
		window.setTimeout(() => setTab("reminder"), 400);
		if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission().then((result) => setNotifyOn(result === "granted"));
	};
	const saveItemDraft = () => {
		if (!draft || draft.type !== "save") return;
		const next = [{
			id: Date.now(),
			text: draft.text.trim() || "Saved item",
			photo: draft.photo,
			mediaKind: draft.mediaKind,
			location: draft.location.trim() || null,
			category: draft.categoryId,
			created: Date.now(),
			color: "#ffffff"
		}, ...saves];
		setSaves(next);
		persistSaves(next);
		const name = categories.find((c) => c.id === draft.categoryId)?.name ?? "Saved";
		setDraft(null);
		resetComposer();
		popSuccess();
		flash(`Saved to ${name}`);
	};
	const addManual = () => {
		const media = attachment();
		if (!input.trim() && !media.photo || !manualDate || !manualTime) {
			flash("Pick a date and a time first.");
			return;
		}
		const time = combineDateTime(manualDate, manualTime);
		if (Number.isNaN(time)) {
			flash("That date doesn't look right.");
			return;
		}
		const next = [{
			id: Date.now(),
			text: input.trim() || (media.mediaKind === "video" ? "Video reminder" : "Photo reminder"),
			photo: media.photo,
			mediaKind: media.mediaKind,
			time,
			timeLabel: formatTimeLabel(time),
			location: manualLocation.trim() || null,
			notified: false,
			completed: false,
			created: Date.now(),
			color: "#ffffff"
		}, ...reminders];
		setReminders(next);
		persistReminders(next);
		resetComposer();
		popSuccess();
		flash("Reminder saved");
		window.setTimeout(() => setTab("reminder"), 400);
	};
	const addSaveTo = (category) => {
		const media = attachment();
		if (!input.trim() && !media.photo) return;
		const next = [{
			id: Date.now(),
			text: input.trim() || (media.mediaKind === "video" ? "Video" : "Photo"),
			photo: media.photo,
			mediaKind: media.mediaKind,
			location: null,
			category: category.id,
			created: Date.now(),
			color: "#ffffff"
		}, ...saves];
		setSaves(next);
		persistSaves(next);
		resetComposer();
		setSelectedCategory(null);
		popSuccess();
		flash(`Saved to ${category.name}`);
	};
	const removeItem = (id, type) => {
		if (type === "reminder") {
			const item = reminders.find((r) => r.id === id);
			const next = reminders.filter((r) => r.id !== id);
			setReminders(next);
			persistReminders(next);
			if (item) flash("Reminder deleted", {
				type,
				item
			});
		} else {
			const item = saves.find((s) => s.id === id);
			const next = saves.filter((s) => s.id !== id);
			setSaves(next);
			persistSaves(next);
			if (item) flash("Item deleted", {
				type,
				item
			});
		}
	};
	const undo = () => {
		if (!toast?.undo) return;
		if (toast.undo.type === "reminder") {
			const next = [toast.undo.item, ...reminders];
			setReminders(next);
			persistReminders(next);
		} else {
			const next = [toast.undo.item, ...saves];
			setSaves(next);
			persistSaves(next);
		}
		setToast(null);
	};
	const toggleDone = (id) => {
		const next = reminders.map((item) => item.id === id ? {
			...item,
			completed: !item.completed
		} : item);
		setReminders(next);
		persistReminders(next);
	};
	const beginEdit = (item, type) => {
		setEditing({
			type,
			id: item.id
		});
		if (type === "reminder" && "time" in item) {
			const date = new Date(item.time);
			setEditForm({
				text: item.text,
				location: item.location ?? "",
				date: toDateInput(item.time),
				time: hhmm(date),
				color: item.color || "#ffffff"
			});
		} else setEditForm({
			text: item.text,
			location: item.location ?? "",
			date: "",
			time: "",
			color: item.color || "#ffffff"
		});
	};
	const commitEdit = () => {
		if (!editing) return;
		if (editing.type === "reminder") {
			const time = combineDateTime(editForm.date, editForm.time);
			const next = reminders.map((item) => item.id === editing.id ? {
				...item,
				text: editForm.text.trim() || item.text,
				location: editForm.location.trim() || null,
				time: Number.isNaN(time) ? item.time : time,
				timeLabel: Number.isNaN(time) ? item.timeLabel : formatTimeLabel(time),
				color: editForm.color,
				notified: Number.isNaN(time) ? item.notified : time > Date.now() ? false : item.notified
			} : item);
			setReminders(next);
			persistReminders(next);
		} else {
			const next = saves.map((item) => item.id === editing.id ? {
				...item,
				text: editForm.text.trim() || item.text,
				location: editForm.location.trim() || null,
				color: editForm.color
			} : item);
			setSaves(next);
			persistSaves(next);
		}
		setEditing(null);
		flash("Changes saved");
	};
	const commitCategory = () => {
		const name = newCategoryName.trim();
		if (!name) return;
		if (editingCategoryId) {
			const next = categories.map((cat) => cat.id === editingCategoryId ? {
				...cat,
				name,
				icon: newCategoryIcon
			} : cat);
			setCategories(next);
			persistCategories(next);
		} else {
			const next = [...categories, {
				id: `custom_${Date.now()}`,
				name,
				icon: newCategoryIcon,
				color: "#E5E7EB",
				custom: true
			}];
			setCategories(next);
			persistCategories(next);
		}
		setNewCategoryName("");
		setNewCategoryIcon("📌");
		setEditingCategoryId(null);
		setShowCategory(false);
	};
	const removeCategory = (id) => {
		if (!categories.find((c) => c.id === id)?.custom) return;
		const next = categories.filter((c) => c.id !== id);
		setCategories(next);
		persistCategories(next);
		if (selectedCategory === id) setSelectedCategory(null);
	};
	const signIn = () => {
		const name = nameDraft.trim();
		if (!name) return;
		const next = { name };
		setProfile(next);
		persistProfile(next);
	};
	const signOut = () => {
		setProfile(null);
		setNameDraft("");
		persistProfile(null);
	};
	const wipe = () => {
		clearAllData();
		setReminders([]);
		setSaves([]);
		setCategories(DEFAULT_CATEGORIES);
		setProfile(null);
		setNameDraft("");
		setShowSettings(false);
		flash("Everything on this device was cleared");
	};
	const filteredReminders = query.trim() ? reminders.filter((item) => `${item.text} ${item.location ?? ""}`.toLowerCase().includes(query.toLowerCase())) : reminders;
	const filteredSaves = query.trim() ? saves.filter((item) => `${item.text} ${item.location ?? ""}`.toLowerCase().includes(query.toLowerCase())) : saves;
	const categoryItems = selectedCategory && selectedCategory !== "manual" ? saves.filter((item) => item.category === selectedCategory) : saves;
	const canCompose = Boolean(input.trim() || photo || video);
	if (!ready) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex h-dvh items-center justify-center bg-paper",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col items-center gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "size-10 animate-spin rounded-full border-2 border-brand border-t-transparent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-mute",
				children: "Opening Re:Mind Me"
			})]
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex h-dvh max-w-md flex-col overflow-hidden bg-paper text-ink shadow-2xl shadow-slate-300/40",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
				className: "z-20 border-b border-line bg-white/85 px-4 py-3 backdrop-blur-xl",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "Open menu",
							onClick: () => setShowMenu(true),
							className: "flex size-11 items-center justify-center rounded-xl hover:bg-slate-100",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { size: 22 })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "flex size-8 items-center justify-center rounded-lg bg-brand text-white",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { size: 16 })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-lg font-bold tracking-tight",
								children: "Re:Mind Me"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "Search",
							onClick: () => setShowSearch(true),
							className: "flex size-11 items-center justify-center rounded-xl hover:bg-slate-100",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { size: 20 })
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "relative flex-1 overflow-y-auto pb-28",
				children: [
					tab === "remind" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "anim-fade space-y-5 p-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "pt-2 pb-1 text-center",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/30",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { size: 28 })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
										className: "text-2xl font-bold",
										children: "Set a reminder"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 text-sm text-mute",
										children: "Write it the way you'd say it."
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AttachmentRow, {
								photo,
								video,
								onClearPhoto: () => setPhoto(null),
								onClearVideo: () => setVideo(null)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-wrap gap-2",
								children: REMIND_CHIPS.map((chip) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setInput((prev) => prev ? `${prev} ${chip.value}` : chip.value),
									className: "rounded-full bg-brand/10 px-3 py-2 text-xs font-semibold text-brand",
									children: chip.label
								}, chip.label))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								value: input,
								onChange: (event) => setInput(event.target.value),
								rows: 3,
								placeholder: "Ingetin aku besok jam 9 meeting di kantor",
								className: "w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 text-base shadow-sm outline-none focus:border-brand"
							}),
							listening && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-semibold text-blush",
								children: "Listening… speak, then pause."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-3 gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-sm font-medium",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Image, { size: 16 }),
											"Photo",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "file",
												accept: "image/*",
												className: "hidden",
												onChange: (event) => onPhoto(event.target.files?.[0])
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: startVoice,
										className: `flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-medium ${listening ? "bg-blush text-white" : "bg-slate-100"}`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { size: 16 }), "Voice"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => void startVideo(),
										className: `flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-medium ${recordingVideo ? "bg-blush text-white" : "bg-slate-100"}`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, { size: 16 }), recordingVideo ? "Stop" : "Video"]
									})
								]
							}),
							showManual ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "anim-up space-y-3 rounded-2xl border border-line bg-white p-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
											className: "font-semibold",
											children: "Date and time"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											"aria-label": "Close",
											onClick: () => setShowManual(false),
											className: "flex size-9 items-center justify-center",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 18 })
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "block text-xs font-medium text-mute",
										children: ["Date", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "date",
											value: manualDate,
											onChange: (e) => setManualDate(e.target.value),
											className: "mt-1 w-full rounded-xl border border-line bg-slate-50 px-3 py-2.5"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "block text-xs font-medium text-mute",
										children: ["Time", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "time",
											value: manualTime,
											onChange: (e) => setManualTime(e.target.value),
											className: "mt-1 w-full rounded-xl border border-line bg-slate-50 px-3 py-2.5"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "block text-xs font-medium text-mute",
										children: ["Location", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											value: manualLocation,
											onChange: (e) => setManualLocation(e.target.value),
											placeholder: "Optional",
											className: "mt-1 w-full rounded-xl border border-line bg-slate-50 px-3 py-2.5"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: addManual,
										disabled: !canCompose || !manualDate || !manualTime,
										className: "h-12 w-full rounded-xl bg-brand font-semibold text-white disabled:bg-slate-300",
										children: "Create reminder"
									})
								]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => void openDraft("reminder"),
									disabled: !canCompose || busy,
									className: "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-white shadow-md shadow-brand/25 disabled:bg-slate-300 disabled:shadow-none",
									children: [busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { size: 18 }), busy ? "Reading it…" : "Create reminder"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => setShowManual(true),
									disabled: !canCompose,
									className: "flex h-11 w-full items-center justify-center gap-1 text-sm text-mute disabled:opacity-40",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { size: 14 }), "or set the time yourself"]
								})]
							})
						]
					}),
					tab === "save" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "anim-fade p-5",
						children: [
							selectedCategory === null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "pt-2 text-center",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-600/25",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bookmark, { size: 28 })
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
												className: "text-2xl font-bold",
												children: "Save something"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "mt-1 text-sm text-mute",
												children: "Ideas, links, places — anything."
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AttachmentRow, {
										photo,
										video,
										onClearPhoto: () => setPhoto(null),
										onClearVideo: () => setVideo(null)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex flex-wrap gap-2",
										children: SAVE_CHIPS.map((chip) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => setInput(chip.prefix),
											className: "rounded-full bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700",
											children: chip.label
										}, chip.label))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										value: input,
										onChange: (e) => setInput(e.target.value),
										rows: 3,
										placeholder: "Lokasi ngedate di Senayan namanya Sate Khas",
										className: "w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 text-base shadow-sm outline-none focus:border-sky-500"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-medium",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Image, { size: 16 }),
											"Add photo",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "file",
												accept: "image/*",
												className: "hidden",
												onChange: (e) => onPhoto(e.target.files?.[0])
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										disabled: !canCompose || busy,
										onClick: () => void openDraft("save"),
										className: "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 font-semibold text-white disabled:bg-slate-300",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { size: 18 }), busy ? "Sorting it…" : "Save it"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: !canCompose,
										onClick: () => setSelectedCategory("manual"),
										className: "h-10 w-full text-sm text-mute disabled:opacity-40",
										children: "or pick a category"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Collections, {
										categories,
										saves,
										onOpen: setSelectedCategory,
										onAdd: () => {
											setEditingCategoryId(null);
											setNewCategoryName("");
											setShowCategory(true);
										}
									})
								]
							}),
							selectedCategory === "manual" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "anim-up space-y-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BackButton, { onClick: () => setSelectedCategory(null) }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-center",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
											className: "text-xl font-bold",
											children: "Choose a category"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-1 text-sm text-mute",
											children: "Where should this live?"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-3 gap-3",
										children: [categories.map((cat) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => addSaveTo(cat),
											className: "flex flex-col items-center gap-2 rounded-2xl border border-line bg-white p-4",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-2xl",
												children: cat.icon
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs font-medium",
												children: cat.name
											})]
										}, cat.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => {
												setEditingCategoryId(null);
												setShowCategory(true);
											},
											className: "flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line p-4 text-mute",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 22 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs font-medium",
												children: "New"
											})]
										})]
									})
								]
							}),
							selectedCategory && selectedCategory !== "manual" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CategoryView, {
								category: categories.find((c) => c.id === selectedCategory),
								items: categoryItems,
								view: saveView,
								onView: setSaveView,
								onBack: () => setSelectedCategory(null),
								onEdit: (item) => beginEdit(item, "save"),
								onDelete: (id) => removeItem(id, "save"),
								onRename: () => {
									const cat = categories.find((c) => c.id === selectedCategory);
									if (!cat) return;
									setEditingCategoryId(cat.id);
									setNewCategoryName(cat.name);
									setNewCategoryIcon(cat.icon);
									setShowCategory(true);
								}
							})
						]
					}),
					tab === "reminder" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "anim-fade space-y-4 p-5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-xl font-bold",
								children: "My reminders"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ViewToggle, {
								value: listView,
								onChange: setListView
							})]
						}), reminders.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyBell, { onCreate: () => setTab("remind") }) : listView === "list" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-3",
							children: reminders.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReminderRow, {
								item,
								onDone: () => toggleDone(item.id),
								onEdit: () => beginEdit(item, "reminder"),
								onDelete: () => removeItem(item.id, "reminder")
							}, item.id))
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-2 gap-3",
							children: reminders.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReminderCard, {
								item,
								onDone: () => toggleDone(item.id),
								onEdit: () => beginEdit(item, "reminder"),
								onDelete: () => removeItem(item.id, "reminder")
							}, item.id))
						})]
					})
				]
			}),
			success && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-ink/10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "anim-pop flex size-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
						size: 40,
						strokeWidth: 3
					})
				})
			}),
			draft && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sheet, {
				onClose: () => setDraft(null),
				title: draft.type === "reminder" ? "Check this reminder" : "Check this save",
				children: [
					draft.photo && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MediaThumb, {
						src: draft.photo,
						kind: draft.mediaKind,
						className: "mb-3 h-32 w-full rounded-xl object-cover"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "mb-3 block text-xs font-medium text-mute",
						children: ["What", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: draft.text,
							onChange: (e) => setDraft({
								...draft,
								text: e.target.value
							}),
							className: "mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5"
						})]
					}),
					draft.type === "reminder" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3 grid grid-cols-2 gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "text-xs font-medium text-mute",
							children: ["Date", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "date",
								value: toDateInput(draft.time),
								onChange: (e) => {
									const time = combineDateTime(e.target.value, hhmm(new Date(draft.time)));
									if (!Number.isNaN(time)) setDraft({
										...draft,
										time,
										dateLabel: dateChip(time),
										timeLabel: hhmm(new Date(time))
									});
								},
								className: "mt-1 w-full rounded-xl border border-line px-3 py-2.5"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "text-xs font-medium text-mute",
							children: ["Time", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "time",
								value: hhmm(new Date(draft.time)),
								onChange: (e) => {
									const time = combineDateTime(toDateInput(draft.time), e.target.value);
									if (!Number.isNaN(time)) setDraft({
										...draft,
										time,
										dateLabel: dateChip(time),
										timeLabel: e.target.value
									});
								},
								className: "mt-1 w-full rounded-xl border border-line px-3 py-2.5"
							})]
						})]
					}),
					draft.type === "save" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mb-1.5 text-xs font-medium text-mute",
							children: "Category"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex gap-2 overflow-x-auto pb-1",
							children: categories.map((cat) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setDraft({
									...draft,
									categoryId: cat.id
								}),
								className: `shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${draft.categoryId === cat.id ? "bg-sky-600 text-white" : "bg-slate-100"}`,
								children: [
									cat.icon,
									" ",
									cat.name
								]
							}, cat.id))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "mb-4 block text-xs font-medium text-mute",
						children: ["Location", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: draft.location,
							onChange: (e) => setDraft({
								...draft,
								location: e.target.value
							}),
							placeholder: "Optional",
							className: "mt-1 w-full rounded-xl border border-line px-3 py-2.5"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setDraft(null),
							className: "h-12 flex-1 rounded-xl bg-slate-100 font-semibold",
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: draft.type === "reminder" ? saveReminderDraft : saveItemDraft,
							className: "h-12 flex-1 rounded-xl bg-brand font-semibold text-white",
							children: "Confirm"
						})]
					})
				]
			}),
			editing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "anim-fade absolute inset-0 z-50 flex items-center justify-center bg-ink/40 p-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "anim-up w-full max-w-sm rounded-3xl bg-white p-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-4 flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
								className: "text-lg font-bold",
								children: ["Edit ", editing.type === "reminder" ? "reminder" : "item"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "Close",
								onClick: () => setEditing(null),
								className: "flex size-9 items-center justify-center rounded-full hover:bg-slate-100",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 18 })
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "mb-3 block text-xs font-medium text-mute",
							children: ["Content", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: editForm.text,
								onChange: (e) => setEditForm({
									...editForm,
									text: e.target.value
								}),
								className: "mt-1 w-full rounded-xl border border-line bg-slate-50 px-3 py-2.5"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "mb-3 block text-xs font-medium text-mute",
							children: ["Location", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: editForm.location,
								onChange: (e) => setEditForm({
									...editForm,
									location: e.target.value
								}),
								className: "mt-1 w-full rounded-xl border border-line bg-slate-50 px-3 py-2.5"
							})]
						}),
						editing.type === "reminder" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-3 grid grid-cols-2 gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "date",
								value: editForm.date,
								onChange: (e) => setEditForm({
									...editForm,
									date: e.target.value
								}),
								className: "rounded-xl border border-line px-3 py-2.5"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "time",
								value: editForm.time,
								onChange: (e) => setEditForm({
									...editForm,
									time: e.target.value
								}),
								className: "rounded-xl border border-line px-3 py-2.5"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-4 flex gap-2",
							children: NOTE_COLORS.map((color) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": `Color ${color}`,
								onClick: () => setEditForm({
									...editForm,
									color
								}),
								className: `size-8 rounded-full border-2 ${editForm.color === color ? "border-brand" : "border-line"}`,
								style: { backgroundColor: color }
							}, color))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setEditing(null),
								className: "h-12 flex-1 rounded-xl bg-slate-100 font-semibold",
								children: "Cancel"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: commitEdit,
								className: "h-12 flex-1 rounded-xl bg-brand font-semibold text-white",
								children: "Save"
							})]
						})
					]
				})
			}),
			showCategory && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "anim-fade absolute inset-0 z-50 flex items-center justify-center bg-ink/40 p-6",
				onClick: () => setShowCategory(false),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "anim-up w-full max-w-sm rounded-3xl bg-white p-5",
					onClick: (e) => e.stopPropagation(),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "mb-4 text-lg font-bold",
							children: editingCategoryId ? "Edit category" : "New category"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: newCategoryName,
							onChange: (e) => setNewCategoryName(e.target.value),
							placeholder: "Travel, shopping…",
							className: "mb-3 w-full rounded-xl border border-line px-3 py-2.5"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-4 grid grid-cols-8 gap-1",
							children: CATEGORY_ICONS.map((icon) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setNewCategoryIcon(icon),
								className: `rounded-lg p-1.5 text-xl ${newCategoryIcon === icon ? "bg-brand/15 ring-2 ring-brand" : ""}`,
								children: icon
							}, icon))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-2",
							children: [editingCategoryId && categories.find((c) => c.id === editingCategoryId)?.custom && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									removeCategory(editingCategoryId);
									setShowCategory(false);
								},
								className: "h-12 flex-1 rounded-xl bg-blush/10 font-semibold text-blush",
								children: "Delete"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: commitCategory,
								disabled: !newCategoryName.trim(),
								className: "h-12 flex-1 rounded-xl bg-brand font-semibold text-white disabled:bg-slate-300",
								children: editingCategoryId ? "Save" : "Create"
							})]
						})
					]
				})
			}),
			showSearch && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "anim-fade absolute inset-0 z-50 overflow-y-auto bg-white p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-4 flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
							size: 16,
							className: "absolute top-1/2 left-3 -translate-y-1/2 text-mute"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							autoFocus: true,
							value: query,
							onChange: (e) => setQuery(e.target.value),
							placeholder: "Search reminders and saves",
							className: "h-12 w-full rounded-xl bg-slate-100 pr-3 pl-9 outline-none"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							setShowSearch(false);
							setQuery("");
						},
						className: "px-2 font-semibold text-brand",
						children: "Cancel"
					})]
				}), !query.trim() ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "py-16 text-center text-sm text-mute",
					children: "Search what you've saved."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchGroup, {
							title: "Reminders",
							empty: filteredReminders.length === 0,
							items: filteredReminders.map((item) => ({
								id: item.id,
								title: item.text,
								meta: item.timeLabel,
								onOpen: () => {
									setShowSearch(false);
									setQuery("");
									setTab("reminder");
								}
							}))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchGroup, {
							title: "Saved",
							empty: filteredSaves.length === 0,
							items: filteredSaves.map((item) => ({
								id: item.id,
								title: item.text,
								meta: categories.find((c) => c.id === item.category)?.name ?? "Saved",
								onOpen: () => {
									setShowSearch(false);
									setQuery("");
									setTab("save");
									setSelectedCategory(item.category);
								}
							}))
						}),
						filteredReminders.length === 0 && filteredSaves.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "py-10 text-center text-sm text-mute",
							children: "Nothing matches."
						})
					]
				})]
			}),
			showMenu && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute inset-0 z-50 flex",
				onClick: () => setShowMenu(false),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "anim-drawer relative flex h-full w-72 flex-col bg-white shadow-2xl",
					onClick: (e) => e.stopPropagation(),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "border-b border-line p-5",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "flex size-12 items-center justify-center rounded-full bg-brand text-white",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { size: 22 })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-semibold",
									children: profile?.name ?? "Guest"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-mute",
									children: profile ? "On this device" : "No name yet"
								})] })]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuRow, {
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { size: 18 }),
									label: "Profile",
									onClick: () => {
										setShowMenu(false);
										setShowProfile(true);
									}
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuRow, {
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { size: 18 }),
									label: "Settings",
									onClick: () => {
										setShowMenu(false);
										setShowSettings(true);
									}
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuRow, {
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleHelp, { size: 18 }),
									label: "How to write",
									onClick: () => {
										setShowMenu(false);
										setShowHelp(true);
									}
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-auto grid grid-cols-2 gap-3 border-t border-line p-5 text-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-2xl font-bold text-brand",
								children: reminders.length
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-mute",
								children: "Reminders"
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-2xl font-bold text-sky-600",
								children: saves.length
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-mute",
								children: "Saved"
							})] })]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex-1 bg-ink/30" })]
			}),
			showProfile && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SidePage, {
				title: "Profile",
				onBack: () => setShowProfile(false),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "py-6 text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-brand text-white",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { size: 36 })
						}), profile ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xl font-bold",
							children: profile.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-mute",
							children: "Stored only on this device"
						})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xl font-bold",
								children: "What should we call you?"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 mb-4 text-sm text-mute",
								children: "Just a name. Nothing leaves this device."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: nameDraft,
								onChange: (e) => setNameDraft(e.target.value),
								placeholder: "Your name",
								className: "mb-3 w-full rounded-xl border border-line px-3 py-3"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: signIn,
								disabled: !nameDraft.trim(),
								className: "h-12 rounded-full bg-brand px-8 font-semibold text-white disabled:bg-slate-300",
								children: "Save name"
							})
						] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-3 gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								n: reminders.length,
								label: "Reminders"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								n: saves.length,
								label: "Saved"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								n: categories.length,
								label: "Categories"
							})
						]
					}),
					profile && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: signOut,
						className: "mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blush/10 font-semibold text-blush",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { size: 18 }), "Clear name"]
					})
				]
			}),
			showSettings && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SidePage, {
				title: "Settings",
				onBack: () => setShowSettings(false),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => void askNotify(),
						className: "flex h-14 w-full items-center justify-between rounded-2xl bg-white px-4 text-left shadow-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block font-semibold",
							children: "Notifications"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs text-mute",
							children: notifyOn ? "On for this browser" : "Off — tap to allow"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, {
							size: 18,
							className: notifyOn ? "text-brand" : "text-mute"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-sm leading-relaxed text-mute",
						children: "Reminders and saves stay in this browser. They are not uploaded, and clearing site data removes them."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: wipe,
						className: "mt-6 h-12 w-full rounded-2xl bg-blush/10 font-semibold text-blush",
						children: "Clear all data"
					})
				]
			}),
			showHelp && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SidePage, {
				title: "How to write",
				onBack: () => setShowHelp(false),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HelpLine, {
						title: "Tomorrow morning",
						body: "besok jam 8 pagi minum vitamin"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HelpLine, {
						title: "In an hour",
						body: "dalam 1 jam jemput anak"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HelpLine, {
						title: "With a place",
						body: "ingetin aku besok jam 9 meeting di kantor"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HelpLine, {
						title: "A place to keep",
						body: "lokasi di Senayan namanya Sate Khas"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HelpLine, {
						title: "A link",
						body: "save link https://example.com"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-sm text-mute",
						children: "You'll always get a check screen before anything is saved, so a wrong time is easy to fix."
					})
				]
			}),
			toast && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "anim-up absolute right-4 bottom-24 left-4 z-40",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-lg",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: toast.message }), toast.undo && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: undo,
						className: "ml-3 font-semibold text-white/80",
						children: "Undo"
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "absolute right-4 bottom-4 left-4 z-30",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex rounded-2xl border border-line bg-white/95 p-1.5 shadow-lg shadow-slate-300/50 backdrop-blur",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavButton, {
							active: tab === "reminder",
							onClick: () => switchTab("reminder"),
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, {
								size: 18,
								fill: tab === "reminder" ? "currentColor" : "none"
							}),
							label: "List"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavButton, {
							active: tab === "remind",
							onClick: () => switchTab("remind"),
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 18 }),
							label: "Remind"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavButton, {
							active: tab === "save",
							onClick: () => switchTab("save"),
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bookmark, {
								size: 18,
								fill: tab === "save" ? "currentColor" : "none"
							}),
							label: "Save"
						})
					]
				})
			})
		]
	});
}
function AttachmentRow({ photo, video, onClearPhoto, onClearVideo }) {
	if (!photo && !video) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex gap-3",
		children: [photo && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: photo,
				alt: "Attached",
				className: "size-20 rounded-xl object-cover"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				"aria-label": "Remove photo",
				onClick: onClearPhoto,
				className: "absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-blush text-white",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 12 })
			})]
		}), video && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
				src: video,
				className: "size-20 rounded-xl object-cover",
				muted: true
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				"aria-label": "Remove video",
				onClick: onClearVideo,
				className: "absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-blush text-white",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 12 })
			})]
		})]
	});
}
function BackButton({ onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: "flex items-center gap-1 text-sm font-medium text-mute",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { size: 16 }), "Back"]
	});
}
function ViewToggle({ value, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex rounded-lg bg-slate-100 p-1",
		children: ["list", "card"].map((mode) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: () => onChange(mode),
			className: `rounded-md px-3 py-1 text-xs font-semibold capitalize ${value === mode ? "bg-white shadow-sm" : "text-mute"}`,
			children: mode
		}, mode))
	});
}
function Collections({ categories, saves, onOpen, onAdd }) {
	if (saves.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "py-6 text-center text-sm text-mute",
		children: "Saved things will collect here."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pt-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-3 flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "font-semibold",
				children: "Collections"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: onAdd,
				className: "flex items-center gap-1 text-xs font-semibold text-brand",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 14 }), "Category"]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid grid-cols-2 gap-3",
			children: categories.map((cat) => {
				const count = saves.filter((item) => item.category === cat.id).length;
				if (!count) return null;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => onOpen(cat.id),
					className: "rounded-2xl border border-line bg-white p-4 text-left",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2 text-2xl",
							children: cat.icon
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm font-semibold",
							children: cat.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xs text-mute",
							children: [
								count,
								" item",
								count === 1 ? "" : "s"
							]
						})
					]
				}, cat.id);
			})
		})]
	});
}
function CategoryView({ category, items, view, onView, onBack, onEdit, onDelete, onRename }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BackButton, { onClick: onBack }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ViewToggle, {
					value: view,
					onChange: onView
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-3xl",
						children: category?.icon
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-xl font-bold",
							children: category?.name ?? "Saved"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm text-mute",
							children: [
								items.length,
								" item",
								items.length === 1 ? "" : "s"
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": "Edit category",
						onClick: onRename,
						className: "flex size-10 items-center justify-center rounded-xl bg-slate-100",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { size: 16 })
					})
				]
			}),
			items.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "py-10 text-center text-sm text-mute",
				children: "Nothing in here yet."
			}),
			view === "list" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-3",
				children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SaveRow, {
					item,
					onEdit: () => onEdit(item),
					onDelete: () => onDelete(item.id)
				}, item.id))
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 gap-3",
				children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "overflow-hidden rounded-2xl border border-line",
					style: { backgroundColor: item.color },
					children: [item.photo && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MediaThumb, {
						src: item.photo,
						kind: item.mediaKind,
						className: "h-24 w-full object-cover"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "line-clamp-3 text-sm font-medium",
							children: item.text
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs text-mute",
								children: getTimeAgo(item.created)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
									label: "Edit",
									onClick: () => onEdit(item),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { size: 12 })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
									label: "Delete",
									onClick: () => onDelete(item.id),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 })
								})]
							})]
						})]
					})]
				}, item.id))
			})
		]
	});
}
function SaveRow({ item, onEdit, onDelete }) {
	const url = firstUrl(item.text);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "flex gap-3 rounded-2xl border border-line bg-white p-4",
		style: { backgroundColor: item.color === "#ffffff" ? void 0 : item.color },
		children: [
			item.photo && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MediaThumb, {
				src: item.photo,
				kind: item.mediaKind,
				className: "size-14 shrink-0 rounded-xl object-cover"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [
					url ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
						href: url,
						target: "_blank",
						rel: "noreferrer",
						className: "block",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium text-sky-700",
							children: hostnameOf(url)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "line-clamp-2 text-sm",
							children: item.text
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium",
						children: item.text
					}),
					item.location && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
						className: "mt-2 inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700",
						href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`,
						target: "_blank",
						rel: "noreferrer",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { size: 12 }), item.location]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-mute",
						children: getTimeAgo(item.created)
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
					label: "Edit",
					onClick: onEdit,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { size: 14 })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
					label: "Delete",
					onClick: onDelete,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 14 })
				})]
			})
		]
	});
}
function ReminderRow({ item, onDone, onEdit, onDelete }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: `flex gap-3 rounded-2xl border border-line p-4 ${item.completed ? "opacity-60" : ""}`,
		style: { backgroundColor: item.color === "#ffffff" ? "#fff" : item.color },
		children: [
			item.photo && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MediaThumb, {
				src: item.photo,
				kind: item.mediaKind,
				className: "size-14 shrink-0 rounded-xl object-cover"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: `font-medium ${item.completed ? "text-mute line-through" : ""}`,
					children: item.text
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 flex flex-wrap gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { size: 12 }), item.timeLabel]
					}), item.location && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
						href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`,
						target: "_blank",
						rel: "noreferrer",
						className: "inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-xs text-sky-700",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { size: 12 }), item.location]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": item.completed ? "Mark not done" : "Mark done",
						onClick: onDone,
						className: `flex size-9 items-center justify-center rounded-lg ${item.completed ? "bg-emerald-500 text-white" : "bg-slate-100"}`,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { size: 16 })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
						label: "Edit",
						onClick: onEdit,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { size: 14 })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
						label: "Delete",
						onClick: onDelete,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 14 })
					})
				]
			})
		]
	});
}
function ReminderCard({ item, onDone, onEdit, onDelete }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: `overflow-hidden rounded-2xl border border-line ${item.completed ? "opacity-60" : ""}`,
		style: { backgroundColor: item.color === "#ffffff" ? "#fff" : item.color },
		children: [item.photo && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MediaThumb, {
			src: item.photo,
			kind: item.mediaKind,
			className: "h-24 w-full object-cover"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "p-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mb-2 flex justify-end",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": "Toggle done",
						onClick: onDone,
						className: `flex size-7 items-center justify-center rounded-lg ${item.completed ? "bg-emerald-500 text-white" : "bg-slate-100"}`,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { size: 12 })
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: `line-clamp-2 text-sm font-medium ${item.completed ? "line-through" : ""}`,
					children: item.text
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 flex items-center gap-1 text-xs text-mute",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { size: 10 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "truncate",
						children: item.timeLabel
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 flex gap-1 border-t border-line pt-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
						label: "Edit",
						onClick: onEdit,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { size: 12 })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
						label: "Delete",
						onClick: onDelete,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 })
					})]
				})
			]
		})]
	});
}
function EmptyBell({ onCreate }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "py-16 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto mb-4 flex size-20 items-center justify-center rounded-3xl bg-brand/10 text-brand",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { size: 32 })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-lg font-semibold",
				children: "No reminders yet"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 mb-4 text-sm text-mute",
				children: "The first one can be a sentence."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onCreate,
				className: "h-11 rounded-xl bg-brand px-5 font-semibold text-white",
				children: "Create reminder"
			})
		]
	});
}
function IconBtn({ label, onClick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-label": label,
		onClick,
		className: "flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500",
		children
	});
}
function Sheet({ title, onClose, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "anim-fade absolute inset-0 z-50 flex items-end bg-ink/40",
		onClick: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "anim-sheet max-h-[88%] w-full overflow-y-auto rounded-t-3xl bg-white p-5",
			onClick: (e) => e.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-auto mb-4 h-1 w-12 rounded-full bg-slate-200" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mb-4 text-center text-lg font-bold",
					children: title
				}),
				children
			]
		})
	});
}
function MenuRow({ icon, label, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: "flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-slate-50",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-mute",
			children: icon
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label })]
	});
}
function SidePage({ title, onBack, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "anim-fade absolute inset-0 z-40 overflow-y-auto bg-paper pb-28",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-white/90 px-3 py-3 backdrop-blur",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				"aria-label": "Back",
				onClick: onBack,
				className: "flex size-10 items-center justify-center rounded-full hover:bg-slate-100",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { size: 22 })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-lg font-semibold",
				children: title
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "p-5",
			children
		})]
	});
}
function Stat({ n, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl bg-white p-4 text-center shadow-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-2xl font-bold text-brand",
			children: n
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 text-xs text-mute",
			children: label
		})]
	});
}
function HelpLine({ title, body }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mb-3 rounded-2xl bg-white p-4 shadow-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm font-semibold",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 text-sm text-mute",
			children: body
		})]
	});
}
function SearchGroup({ title, items, empty }) {
	if (empty) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
		className: "mb-2 text-xs font-semibold tracking-wide text-mute uppercase",
		children: title
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-2",
		children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: item.onOpen,
			className: "w-full rounded-xl bg-slate-50 p-3 text-left",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "line-clamp-2 font-medium",
				children: item.title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs text-mute",
				children: item.meta
			})]
		}, item.id))
	})] });
}
function NavButton({ active, onClick, icon, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: `flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-semibold ${active ? "bg-brand text-white" : "text-mute"}`,
		children: [icon, label]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RemindApp, {});
}
//#endregion
export { Home as component };

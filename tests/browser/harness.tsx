import { createRoot } from "react-dom/client";
import { isCropId, type CropId } from "@/lib/crops/catalog";
import { App } from "@/components/app/App";
import { TimerService } from "@/lib/timer/TimerService";
import { seedMonth } from "@/lib/debug/seeder";
import { DEFAULT_SETTINGS, readSettings } from "@/lib/settings";
import type { SolanumHost, Screen } from "@/types/host";

const parameters = new URLSearchParams(window.location.search);
const month = new Date(2026, 9, 1);
const seededUntil = new Date(2026, 9, 31, 18).getTime();
// January to October, so the year overview has something in most months.
const history = Array.from({ length: 10 }, (_, index) =>
  seedMonth(new Date(2026, index, 1), seededUntil),
).flat();
const files = new Map(history.map((session) => [session.id, session]));
// ?crop=<id> picks the running crop. ?elapsed=<minutes> opens the timer already that far into a 25 minute focus.
const elapsedMinutes = Number(parameters.get("elapsed"));
if (elapsedMinutes > 0) {
  const startedAt = Date.now() - elapsedMinutes * 60_000;
  files.set("harness-running", {
    ...history[0],
    id: "harness-running",
    sessionId: "harness-running",
    source: undefined,
    startedAt,
    updatedAt: startedAt,
    durationMs: 25 * 60_000,
    phase: "focus",
    status: "running",
    deadline: startedAt + 25 * 60_000,
    remainingMs: 25 * 60_000,
    focusEndedAt: null,
    intervals: [{ start: startedAt, end: null }],
    crop: isCropId(parameters.get("crop")) ? (parameters.get("crop") as CropId) : "tomato",
  });
}
const timer = new TimerService(
  {
    readAll: async () => [...files.values()],
    append: async (revision) => {
      files.set(revision.id, revision);
    },
  },
  { now: Date.now, id: () => crypto.randomUUID() },
);
let screen: Screen = "harvest";
if (parameters.get("view") === "timer") screen = "timer";
const host: SolanumHost = {
  timer,
  settings: readSettings({ ...DEFAULT_SETTINGS, season: parameters.get("season") }),
  saveSettings: async (settings) => {
    host.settings = settings;
  },
  tags: () => ["demo", "study"],
  notes: () => ["Projects/Alpha.md", "Projects/Beta.md", "Inbox.md"],
  activeNote: () => "Projects/Alpha.md",
  assetUrl: (name) => `${location.origin}/assets/crops/${name}`,
  openNote() {},
  openSettings() {},
  unlockAudio() {},
  previewSound() {},
  readAsset: async (name) => {
    const response = await fetch(`/native-assets/${name}`);
    if (!response.ok) throw new Error(`Asset read failed: ${name}`);
    return response.arrayBuffer();
  },
  navigate(view) {
    location.search = `?view=${view}`;
  },
};
await timer.refresh();
window.setInterval(() => {
  void timer.tick();
}, 1000);
createRoot(document.getElementById("root")!).render(
  <App host={host} screen={screen} initialMonth={month} />,
);

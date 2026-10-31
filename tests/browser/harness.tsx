import { createRoot } from "react-dom/client";
import { App } from "../../src/components/app/App";
import { TimerService } from "../../src/lib/timer/TimerService";
import { seedMonth } from "../../src/lib/debug/seeder";
import { DEFAULT_SETTINGS } from "../../src/lib/settings";
import type { SolanumHost, Screen } from "../../src/types/host";

const month = new Date(2026, 9, 1);
const history = seedMonth(month, new Date(2026, 9, 31, 18).getTime());
const files = new Map(history.map((session) => [session.id, session]));
const timer = new TimerService(
  {
    readAll: async () => [...files.values()],
    append: async (revision) => {
      files.set(revision.id, revision);
    },
  },
  { now: Date.now, id: () => crypto.randomUUID() },
);
const parameters = new URLSearchParams(window.location.search);
let screen: Screen = "harvest";
if (parameters.get("view") === "timer") screen = "timer";
const host: SolanumHost = {
  timer,
  settings: { ...DEFAULT_SETTINGS },
  saveSettings: async (settings) => {
    host.settings = settings;
  },
  tags: () => ["demo", "study"],
  notes: () => [],
  activeNote: () => null,
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

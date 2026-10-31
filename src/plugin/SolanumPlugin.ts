import { Notice, Plugin, type App, type TAbstractFile } from "obsidian";
import { SolanumView, VIEW_TYPE_SOLANUM, VIEW_TYPE_HARVEST } from "@/views/SolanumView";
import { TimerService } from "@/lib/timer/TimerService";
import {
  DEBUG_SESSION_FOLDER,
  SESSION_FOLDER,
  VaultSessionStore,
} from "@/lib/storage/VaultSessionStore";
import { DEFAULT_SETTINGS, readSettings, type Settings } from "@/lib/settings";
import type { SolanumHost } from "@/types/host";
import { CompletionAudio } from "@/lib/audio/CompletionAudio";
import { DEBUG_CONFIG } from "@/lib/debug/config";
import { DebugTools } from "@/lib/debug/DebugTools";
import { VaultNoteIndex } from "@/plugin/VaultNoteIndex";
import { SolanumSettingsTab } from "@/plugin/SolanumSettingsTab";
import { releaseAppStore, updateDefaultMinutes } from "@/state/appStore";

interface SettingsController {
  open(): void;
  openTabById(id: string): void;
}
interface SettingsApp extends App {
  setting: SettingsController;
}

export default class SolanumPlugin extends Plugin implements SolanumHost {
  timer!: TimerService;
  debug?: DebugTools;
  settings: Settings = { ...DEFAULT_SETTINGS };
  private audio = new CompletionAudio();
  private heartbeat: number | null = null;
  private syncPoll: number | null = null;
  private syncDebounce: number | null = null;
  private stopped = false;
  private lastError = "";
  private noteIndex!: VaultNoteIndex;

  async onload(): Promise<void> {
    this.stopped = false;
    this.noteIndex = new VaultNoteIndex(this.app.vault, this.app.metadataCache);
    this.settings = readSettings(await this.loadData());
    this.addSettingTab(new SolanumSettingsTab(this.app, this, this));
    const store = new VaultSessionStore(this.app.vault.adapter, { debug: DEBUG_CONFIG.enabled });
    this.timer = new TimerService(store, {
      now: Date.now,
      debug: DEBUG_CONFIG.enabled,
      id: () => crypto.randomUUID(),
      notify: (phase) => {
        new Notice(
          phase === "focus"
            ? "Solanum: your crop is ready! Time for a break."
            : "Solanum: break finished. Ready to plant again?",
        );
        if (this.settings.sound) this.audio.play(this.settings.volume);
      },
    });
    if (DEBUG_CONFIG.enabled) this.debug = new DebugTools(this.timer, store, DEBUG_CONFIG);
    await this.background(() => this.timer.refresh());
    this.registerView(VIEW_TYPE_SOLANUM, (leaf) => new SolanumView(leaf, this, "timer"));
    this.registerView(VIEW_TYPE_HARVEST, (leaf) => new SolanumView(leaf, this, "harvest"));

    this.addRibbonIcon("timer", "Open Solanum", () => {
      this.navigate("timer");
    });

    this.addCommand({
      id: "open-sidebar",
      name: "Open timer sidebar",
      callback: () => {
        this.navigate("timer");
      },
    });

    this.addCommand({
      id: "open-harvest",
      name: "Open harvest calendar",
      callback: () => this.navigate("harvest"),
    });

    const onSync = (file: TAbstractFile) => {
      this.noteIndex.invalidate();
      if (
        ![SESSION_FOLDER, DEBUG_SESSION_FOLDER].some((folder) =>
          file.path.startsWith(`${folder}/`),
        ) ||
        this.stopped
      )
        return;
      if (this.syncDebounce !== null) window.clearTimeout(this.syncDebounce);
      this.syncDebounce = window.setTimeout(() => {
        void this.background(() => this.timer.refresh());
      }, 500);
    };
    this.registerEvent(this.app.vault.on("create", onSync));
    this.registerEvent(this.app.vault.on("modify", onSync));
    this.registerEvent(this.app.vault.on("delete", onSync));
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        this.noteIndex.invalidate();
        void this.background(() => this.timer.renameNote(oldPath, file.path));
      }),
    );
    this.registerEvent(this.app.metadataCache.on("changed", this.noteIndex.invalidate));
    this.registerEvent(this.app.metadataCache.on("resolved", this.noteIndex.invalidate));
    this.heartbeat = window.setInterval(() => {
      void this.background(async () => {
        await this.timer.tick();
        await this.debug?.tick();
      });
    }, 1000);
    // Adapter writes / some sync providers do not immediately emit vault events.
    this.syncPoll = window.setInterval(() => {
      void this.background(() => this.timer.refresh());
    }, 15_000);
    this.registerInterval(this.heartbeat);
    this.registerInterval(this.syncPoll);

    this.app.workspace.onLayoutReady(() => {
      if (!this.stopped) void this.background(() => this.openSidebar("timer", false));
    });
  }

  onunload(): void {
    this.stopped = true;
    if (this.heartbeat !== null) window.clearInterval(this.heartbeat);
    if (this.syncPoll !== null) window.clearInterval(this.syncPoll);
    if (this.syncDebounce !== null) window.clearTimeout(this.syncDebounce);
    this.audio.close();
    releaseAppStore(this.timer);
    // Never cancel or pause persisted crops when the plugin / Obsidian closes.
  }

  private async background(action: () => Promise<unknown>) {
    if (this.stopped) return;
    try {
      await action();
      this.lastError = "";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message !== this.lastError) {
        new Notice(`Solanum: ${message}`, 10_000);
        this.lastError = message;
      }
      console.error("Solanum", error);
    }
  }

  async saveSettings(settings: Settings): Promise<void> {
    const next = readSettings(settings);
    const previousMinutes = this.settings.defaultMinutes;
    await this.saveData(next);
    this.settings = next;
    if (next.defaultMinutes !== previousMinutes)
      updateDefaultMinutes(this.timer, next.defaultMinutes);
  }

  tags = () => this.noteIndex.tags();
  openSettings = () => {
    // Obsidian exposes its settings controller at runtime, outside the public App types.
    const app = this.app as SettingsApp;
    app.setting.open();
    app.setting.openTabById(this.manifest.id);
  };
  notes = () => this.noteIndex.notes();
  activeNote = () => this.app.workspace.getActiveFile()?.path ?? null;
  openNote = (path: string) => {
    if (!this.app.vault.getAbstractFileByPath(path)) {
      new Notice(`Note not found: ${path}`);
      return;
    }
    void this.app.workspace.openLinkText(path, "", false);
  };
  assetUrl = (name: string) =>
    this.app.vault.adapter.getResourcePath(`${this.manifest.dir}/assets/crops/${name}`);
  readAsset = (name: string): Promise<ArrayBuffer> =>
    this.app.vault.adapter.readBinary(`${this.manifest.dir}/assets/crops/${name}`);
  navigate = (screen: "timer" | "harvest") => {
    void this.background(() => this.openSidebar(screen, true));
  };
  unlockAudio = () => this.audio.unlock();
  previewSound = () => {
    this.audio.unlock();
    window.setTimeout(() => this.audio.play(this.settings.volume), 100);
  };

  private async openSidebar(screen: "timer" | "harvest", reveal: boolean): Promise<void> {
    const { workspace } = this.app;
    const type = screen === "timer" ? VIEW_TYPE_SOLANUM : VIEW_TYPE_HARVEST;
    let leaf = workspace.getLeavesOfType(type)[0];

    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(true);
      if (!rightLeaf) return;

      await rightLeaf.setViewState({ type, active: true });
      leaf = rightLeaf;
    }

    if (reveal) await workspace.revealLeaf(leaf);
  }
}

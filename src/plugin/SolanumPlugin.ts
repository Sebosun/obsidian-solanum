import { Notice, Plugin, type App, type TAbstractFile } from "obsidian";
import { SolanumView, VIEW_TYPE_SOLANUM, VIEW_TYPE_HARVEST } from "@/views/SolanumView";
import { TimerService } from "@/lib/timer/TimerService";
import { VaultSessionStore } from "@/lib/storage/VaultSessionStore";
import { DEBUG_SESSION_FOLDER, parseSessionFolder } from "@/lib/storage/folder";
import { SessionFolderManager } from "@/lib/storage/SessionFolderManager";
import type { MovePlan, MoveResult } from "@/lib/storage/migration";
import { DEFAULT_SETTINGS, readSettings, type Settings } from "@/lib/settings";
import { DayNoteWriter, type DayNoteTotals } from "@/lib/notes/DayNoteWriter";
import { daysTouched } from "@/lib/notes/days";
import { dayKey } from "@/lib/harvest/model";
import type { CompletionPhase } from "@/types/host";
import type { SettingsServices, SolanumHost } from "@/types/host";
import {
  SessionExchange,
  type ExportResult,
  type ImportResult,
} from "@/lib/storage/SessionExchange";
import { CompletionAudio } from "@/lib/audio/CompletionAudio";
import { SoundLibrary } from "@/lib/audio/SoundLibrary";
import { DEBUG_CONFIG } from "@/lib/debug/config";
import { DebugTools } from "@/lib/debug/DebugTools";
import { VaultNoteIndex } from "@/plugin/VaultNoteIndex";
import { SolanumSettingsTab } from "@/plugin/SolanumSettingsTab";
import {
  releaseAppStore,
  updateDefaultMinutes,
  updatePresets,
  updateSeason,
} from "@/state/appStore";

const DAY_NOTE_DEBOUNCE_MS = 1_500;

function describeDayNotes(totals: DayNoteTotals): string {
  return `Day notes: ${totals.created} new, ${totals.updated} updated, ${totals.unchanged} unchanged.`;
}

interface SettingsController {
  open(): void;
  openTabById(id: string): void;
}
interface SettingsApp extends App {
  setting: SettingsController;
}

export default class SolanumPlugin extends Plugin implements SolanumHost, SettingsServices {
  timer!: TimerService;
  debug?: DebugTools;
  settings: Settings = { ...DEFAULT_SETTINGS };
  private audio = new CompletionAudio();
  private sounds!: SoundLibrary;
  private heartbeat: number | null = null;
  private syncPoll: number | null = null;
  private syncDebounce: number | null = null;
  private stopped = false;
  private lastError = "";
  private noteIndex!: VaultNoteIndex;
  private store!: VaultSessionStore;
  private folders!: SessionFolderManager;
  private exchange!: SessionExchange;
  private dayNotes!: DayNoteWriter;
  private seenRevisions = new Map<string, string>();
  private pendingDays = new Map<string, Date>();
  private dayNoteTimer: number | null = null;
  private unsubscribeDayNotes: (() => void) | null = null;

  async onload(): Promise<void> {
    this.stopped = false;
    this.noteIndex = new VaultNoteIndex(this.app.vault, this.app.metadataCache);
    this.settings = readSettings(await this.loadData());
    this.sounds = new SoundLibrary(
      this.audio,
      (path) => this.app.vault.adapter.readBinary(path),
      (path, reason) => new Notice(`Solanum: ${path}: ${reason} Using the built-in chime.`),
    );
    this.addSettingTab(new SolanumSettingsTab(this.app, this, this, this));
    const store = new VaultSessionStore(this.app.vault.adapter, {
      debug: DEBUG_CONFIG.enabled,
      folder: this.settings.sessionFolder,
    });
    this.store = store;
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
        void this.playCompletion(phase);
      },
    });
    this.folders = new SessionFolderManager(this.app.vault.adapter, store, this.timer);
    this.exchange = new SessionExchange(this.app.vault.adapter, store, this.timer, Date.now);
    if (DEBUG_CONFIG.enabled) this.debug = new DebugTools(this.timer, store, DEBUG_CONFIG);
    this.dayNotes = new DayNoteWriter(this.app.vault.adapter, () => this.settings.dayNotesFolder);
    await this.background(() => this.timer.refresh());
    // Existing history is the baseline: notes follow changes, they are not backfilled at startup.
    for (const session of this.timer.getState().sessions)
      this.seenRevisions.set(session.sessionId, session.id);
    this.unsubscribeDayNotes = this.timer.subscribe(this.onSessionsChanged);
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
      id: "open-today-note",
      name: "Open today's day note",
      callback: () => void this.openDayNote(new Date()),
    });
    this.addCommand({
      id: "write-all-day-notes",
      name: "Write day notes for all history",
      callback: () =>
        void this.background(async () => {
          new Notice(describeDayNotes(await this.writeAllDayNotes()));
        }),
    });
    this.addCommand({
      id: "open-harvest",
      name: "Open harvest calendar",
      callback: () => this.navigate("harvest"),
    });

    const onSync = (file: TAbstractFile) => {
      this.noteIndex.invalidate();
      this.sounds.invalidate(file.path);
      if (
        ![this.store.folder, DEBUG_SESSION_FOLDER].some((folder) =>
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
        this.sounds.invalidate(oldPath);
        this.sounds.invalidate(file.path);
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
    if (this.dayNoteTimer !== null) window.clearTimeout(this.dayNoteTimer);
    this.unsubscribeDayNotes?.();
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

  /** The session folder only changes through `moveSessionFolder`, which also moves the files. */
  async saveSettings(settings: Settings): Promise<void> {
    await this.persist({ ...readSettings(settings), sessionFolder: this.settings.sessionFolder });
  }

  private async persist(next: Settings): Promise<void> {
    const previousMinutes = this.settings.defaultMinutes;
    const previous = this.settings;
    await this.saveData(next);
    this.settings = next;
    for (const key of ["focusSound", "breakSound"] as const) {
      if (next[key] === previous[key]) continue;
      if (previous[key]) this.sounds.invalidate(previous[key]);
      // Decode now so a bad file is reported while the user is still in settings.
      if (next[key]) void this.sounds.load(next[key]);
    }
    if (next.defaultMinutes !== previousMinutes)
      updateDefaultMinutes(this.timer, next.defaultMinutes);
    updateSeason(this.timer, next.season);
    updatePresets(this.timer, next.presets, next.defaultMinutes);
  }

  planSessionFolder = (folder: string): Promise<MovePlan> => this.folders.plan(this.valid(folder));

  moveSessionFolder = async (folder: string): Promise<MoveResult> => {
    const target = this.valid(folder);
    const result = await this.folders.relocate(target);
    await this.persist({ ...this.settings, sessionFolder: target });
    return result;
  };

  private onSessionsChanged = () => {
    const { sessions } = this.timer.getState();
    const changed = sessions.filter(
      (session) =>
        session.source === undefined && this.seenRevisions.get(session.sessionId) !== session.id,
    );
    for (const session of sessions) this.seenRevisions.set(session.sessionId, session.id);
    if (!this.settings.dayNotes || this.stopped || changed.length === 0) return;
    for (const day of daysTouched(changed, Date.now())) this.pendingDays.set(dayKey(day), day);
    if (this.dayNoteTimer !== null) window.clearTimeout(this.dayNoteTimer);
    this.dayNoteTimer = window.setTimeout(this.flushDayNotes, DAY_NOTE_DEBOUNCE_MS);
  };

  private flushDayNotes = () => {
    const days = [...this.pendingDays.values()];
    this.pendingDays.clear();
    this.dayNoteTimer = null;
    void this.background(async () => {
      for (const day of days) await this.dayNotes.write(this.writableSessions(), day, Date.now());
    });
  };

  /** Sessions with an unresolved sync conflict have no single truth to write down yet. */
  private writableSessions() {
    const { sessions, conflicts } = this.timer.getState();
    return sessions.filter(
      (session) => !conflicts.some((conflict) => conflict.sessionId === session.sessionId),
    );
  }

  openDayNote = (day: Date): Promise<void> =>
    this.background(async () => {
      const outcome = await this.dayNotes.write(this.writableSessions(), day, Date.now());
      if (outcome === "empty") {
        new Notice(`Solanum: no focused time on ${dayKey(day)}.`);
        return;
      }
      await this.app.workspace.openLinkText(this.dayNotes.pathFor(day), "", false);
    });

  writeAllDayNotes = (): Promise<DayNoteTotals> =>
    this.dayNotes.writeAll(this.writableSessions(), Date.now());

  exportSessions = (): Promise<ExportResult> => this.exchange.export();
  importSessions = (text: string): Promise<ImportResult> => this.exchange.import(text);

  private valid(folder: string): string {
    const parsed = parseSessionFolder(folder);
    if (!parsed.ok) throw new Error(parsed.reason);
    return parsed.folder;
  }

  /** Another device changed our synced settings; follow its folder so every device agrees. */
  async onExternalSettingsChange(): Promise<void> {
    const next = readSettings(await this.loadData());
    const previousMinutes = this.settings.defaultMinutes;
    this.settings = next;
    if (next.defaultMinutes !== previousMinutes)
      updateDefaultMinutes(this.timer, next.defaultMinutes);
    updateSeason(this.timer, next.season);
    updatePresets(this.timer, next.presets, next.defaultMinutes);
    if (next.sessionFolder === this.folders.folder) return;
    await this.background(async () => {
      const result = await this.folders.relocate(next.sessionFolder);
      new Notice(`Solanum: sessions now live in ${next.sessionFolder} (${result.moved} moved).`);
    });
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
  previewSound = (phase: CompletionPhase = "focus") => {
    this.audio.unlock();
    window.setTimeout(() => void this.playCompletion(phase, true), 100);
  };

  private async playCompletion(phase: CompletionPhase, preview = false): Promise<void> {
    if (!this.settings.sound && !preview) return;
    const path = phase === "focus" ? this.settings.focusSound : this.settings.breakSound;
    const clip = path ? await this.sounds.load(path) : null;
    this.audio.play(this.settings.volume, clip);
  }

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

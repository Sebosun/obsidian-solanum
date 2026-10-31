import { Notice, Plugin, TFile, type App, type TAbstractFile } from "obsidian";
import { SolanumView, VIEW_TYPE_SOLANUM, VIEW_TYPE_HARVEST } from "@/views/SolanumView";
import { TimerService } from "@/lib/timer/TimerService";
import { VaultSessionStore } from "@/lib/storage/VaultSessionStore";
import { parseSessionFolder } from "@/lib/storage/folder";
import type { DayNoteMigrationPlan } from "@/lib/notes/migration";
import { SessionFolderManager } from "@/lib/storage/SessionFolderManager";
import type { MovePlan, MoveResult } from "@/lib/storage/migration";
import { DEFAULT_SETTINGS, readSettings, type Settings } from "@/lib/settings";
import type { ForestImportResult, ForestMapping } from "@/lib/import/forest";
import { describeDocumentTotals, type DayNoteTotals } from "@/lib/notes/documentReport";
import { DayNoteService, type DayNoteMigrationState } from "@/lib/notes/DayNoteService";
import type { ImportResult } from "@/lib/storage/exchange";
import {
  SessionExchange,
  type ExportResult,
  type ImportOptions,
} from "@/lib/storage/SessionExchange";
import { dayKey } from "@/lib/harvest/model";
import { errorMessage } from "@/lib/text";
import { MS_PER_SECOND } from "@/lib/time";
import type { CompletionPhase, Screen, SettingsServices, SolanumHost } from "@/types/host";
import { DEBUG_CONFIG } from "@/lib/debug/config";
import { DebugTools } from "@/lib/debug/DebugTools";
import { CompletionSounds } from "@/plugin/CompletionSounds";
import { ImportTracker } from "@/plugin/ImportTracker";
import { LiveDayNotes } from "@/plugin/LiveDayNotes";
import { openSidebar } from "@/plugin/openSidebar";
import { SessionTransfer } from "@/plugin/SessionTransfer";
import { SYNC_POLL_MS, VaultSync } from "@/plugin/VaultSync";
import { VaultNoteIndex } from "@/plugin/VaultNoteIndex";
import { SolanumSettingsTab } from "@/plugin/SolanumSettingsTab";
import {
  releaseAppStore,
  updateDefaultMinutes,
  updatePresets,
  updateSeason,
} from "@/state/appStore";

/** The timer is checked this often for an expired phase. */
const HEARTBEAT_MS = MS_PER_SECOND;
/** How long a background failure stays on screen. */
const ERROR_NOTICE_MS = 10_000;
/** Gives the browser a moment to start audio after the gesture that unlocked it. */
const SOUND_PREVIEW_DELAY_MS = 100;

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
  private sounds!: CompletionSounds;
  private heartbeat: number | null = null;
  private syncPoll: number | null = null;
  private sync: VaultSync | null = null;
  private liveDayNotes: LiveDayNotes | null = null;
  private stopped = false;
  private lastError = "";
  private noteIndex!: VaultNoteIndex;
  private store!: VaultSessionStore;
  private folders!: SessionFolderManager;
  private exchange!: SessionExchange;
  private dayNotes!: DayNoteService;
  private imports = new ImportTracker();
  private transfer!: SessionTransfer;

  async onload(): Promise<void> {
    this.stopped = false;
    this.noteIndex = new VaultNoteIndex(this.app.vault, this.app.metadataCache);
    this.settings = readSettings(await this.loadData());
    this.sounds = new CompletionSounds(
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
        void this.sounds.play(phase, this.settings);
      },
    });
    this.folders = new SessionFolderManager(this.app.vault.adapter, store, this.timer);
    this.exchange = new SessionExchange(this.app.vault.adapter, store, this.timer, Date.now);
    if (DEBUG_CONFIG.enabled) this.debug = new DebugTools(this.timer, store, DEBUG_CONFIG);
    this.dayNotes = new DayNoteService({
      adapter: this.app.vault.adapter,
      getLocation: () => this.settings,
      saveLocation: (location) => this.persist({ ...this.settings, ...location }),
      rename: async (source, target) => {
        const file = this.app.vault.getAbstractFileByPath(source);
        if (!(file instanceof TFile))
          throw new Error(`Document not indexed yet: ${source}. Retry shortly`);
        await this.app.fileManager.renameFile(file, target);
      },
    });
    this.transfer = new SessionTransfer({
      exchange: this.exchange,
      dayNotes: this.dayNotes,
      imports: this.imports,
      notes: () => this.noteIndex.notes(),
      breakMinutes: () => this.settings.breakMinutes,
      writableSessions: () => this.writableSessions(),
      now: Date.now,
    });
    await this.background(() => this.timer.refresh());
    this.liveDayNotes = new LiveDayNotes({
      timer: this.timer,
      enabled: () => this.settings.dayNotes && !this.stopped,
      isImporting: (sessionId) => this.imports.isImporting(sessionId),
      now: Date.now,
      write: (days) => this.writeLiveDayNotes(days),
    });
    this.liveDayNotes.start();
    this.registerView(VIEW_TYPE_SOLANUM, (leaf) => new SolanumView(leaf, this, "timer"));
    this.registerView(VIEW_TYPE_HARVEST, (leaf) => new SolanumView(leaf, this, "harvest"));
    this.registerCommands();
    this.watchVault();
    this.app.workspace.onLayoutReady(() => {
      if (!this.stopped)
        void this.background(() => openSidebar(this.app.workspace, "timer", false));
    });
  }

  onunload(): void {
    this.stopped = true;
    if (this.heartbeat !== null) window.clearInterval(this.heartbeat);
    if (this.syncPoll !== null) window.clearInterval(this.syncPoll);
    this.sync?.dispose();
    this.liveDayNotes?.dispose();
    this.sounds.close();
    releaseAppStore(this.timer);
    // Never cancel or pause persisted crops when the plugin / Obsidian closes.
  }

  private registerCommands(): void {
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
      name: "Open today's document",
      callback: () => void this.openDayNote(new Date()),
    });
    this.addCommand({
      id: "write-all-day-notes",
      name: "Write documents for all history",
      callback: () =>
        void this.background(async () => {
          new Notice(describeDocumentTotals(await this.writeAllDayNotes()));
        }),
    });
    this.addCommand({
      id: "open-harvest",
      name: "Open harvest calendar",
      callback: () => this.navigate("harvest"),
    });
  }

  /** Follows the vault and the clock: file events, renames, the timer's heartbeat, and sync polling. */
  private watchVault(): void {
    this.sync = new VaultSync({
      folders: () => this.store.watchedFolders(),
      refresh: () => void this.background(() => this.timer.refresh()),
    });
    const onFileChange = (file: TAbstractFile) => {
      this.noteIndex.invalidate();
      this.sounds.invalidate(file.path);
      this.sync?.onVaultChange(file.path);
    };
    this.registerEvent(this.app.vault.on("create", onFileChange));
    this.registerEvent(this.app.vault.on("modify", onFileChange));
    this.registerEvent(this.app.vault.on("delete", onFileChange));
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
    }, HEARTBEAT_MS);
    this.syncPoll = window.setInterval(() => {
      void this.background(() => this.timer.refresh());
    }, SYNC_POLL_MS);
    this.registerInterval(this.heartbeat);
    this.registerInterval(this.syncPoll);
  }

  private async background(action: () => Promise<unknown>) {
    if (this.stopped) return;
    try {
      await action();
      this.lastError = "";
    } catch (error) {
      const message = errorMessage(error);
      if (message !== this.lastError) {
        new Notice(`Solanum: ${message}`, ERROR_NOTICE_MS);
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
    await this.saveData(next);
    this.applySettings(next);
  }

  /** Makes `next` the live settings, wherever they came from, and tells whatever follows them. */
  private applySettings(next: Settings): void {
    const previous = this.settings;
    this.settings = next;
    this.sounds.settingsChanged(previous, next);
    if (next.defaultMinutes !== previous.defaultMinutes)
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

  private writeLiveDayNotes(days: Date[]): void {
    void this.background(async () => {
      for (const day of days) await this.dayNotes.write(this.writableSessions(), day, Date.now());
    });
  }

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

  planDayNoteMigration = (): Promise<DayNoteMigrationPlan> => this.dayNotes.planMigration();
  dayNoteMigrationState = (): DayNoteMigrationState => this.dayNotes.migrationState();

  exportSessions = (): Promise<ExportResult> => this.exchange.export();
  importSessions = (text: string, options?: ImportOptions): Promise<ImportResult> =>
    this.transfer.importSessions(text, options);
  importForest = (
    csv: string,
    mapping: ForestMapping,
    options?: ImportOptions,
  ): Promise<ForestImportResult> => this.transfer.importForest(csv, mapping, options);

  private valid(folder: string): string {
    const parsed = parseSessionFolder(folder);
    if (!parsed.ok) throw new Error(parsed.reason);
    return parsed.folder;
  }

  /** Another device changed our synced settings; follow its folder so every device agrees. */
  async onExternalSettingsChange(): Promise<void> {
    const next = readSettings(await this.loadData());
    this.applySettings(next);
    if (next.sessionFolder === this.folders.folder) return;
    await this.background(async () => {
      const result = await this.folders.relocate(next.sessionFolder);
      new Notice(`Solanum: sessions now live in ${next.sessionFolder} (${result.moved} moved).`);
    });
  }

  tags = () => this.noteIndex.tags();
  noteTags = (path: string) => this.noteIndex.tagsOf(path);
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
    this.app.vault.adapter.getResourcePath(`${this.manifest.dir}/assets/${name}`);
  readAsset = (name: string): Promise<ArrayBuffer> =>
    this.app.vault.adapter.readBinary(`${this.manifest.dir}/assets/${name}`);
  navigate = (screen: Screen) => {
    void this.background(() => openSidebar(this.app.workspace, screen, true));
  };
  unlockAudio = () => this.sounds.unlock();
  previewSound = (phase: CompletionPhase = "focus") => {
    this.sounds.unlock();
    window.setTimeout(
      () => void this.sounds.play(phase, this.settings, true),
      SOUND_PREVIEW_DELAY_MS,
    );
  };
}

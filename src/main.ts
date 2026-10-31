import { Notice, Plugin } from "obsidian";
import { SolanumView, VIEW_TYPE_SOLANUM, VIEW_TYPE_HARVEST } from "./view";
import { TimerService } from "./timer";
import { DEBUG_SESSION_FOLDER, SESSION_FOLDER, VaultSessionStore } from "./storage";
import { DEFAULT_SETTINGS, readSettings, type Settings, type SolanumHost } from "./host";
import { CompletionAudio } from "./audio";
import { DEBUG_CONFIG } from "./lib/debug/config";
import { DebugTools } from "./lib/debug/DebugTools";

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
  private tagCache: string[] | null = null;
  private noteCache: string[] | null = null;

  async onload(): Promise<void> {
    this.stopped = false;
    this.settings = readSettings(await this.loadData());
    const store = new VaultSessionStore(this.app.vault.adapter, { debug: DEBUG_CONFIG.enabled });
    this.timer = new TimerService(store, {
      now: Date.now,
      debug: DEBUG_CONFIG.enabled,
      id: () => crypto.randomUUID(),
      notify: (phase) => {
        new Notice(phase === "focus" ? "Solanum: your crop is ready! Time for a break." : "Solanum: break finished. Ready to plant again?");
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

    this.addCommand({ id: "open-harvest", name: "Open harvest calendar", callback: () => this.navigate("harvest") });

    const onSync = (file: { path: string }) => {
      this.invalidateSuggestions();
      if (![SESSION_FOLDER, DEBUG_SESSION_FOLDER].some((folder) => file.path.startsWith(`${folder}/`)) || this.stopped) return;
      if (this.syncDebounce !== null) window.clearTimeout(this.syncDebounce);
      this.syncDebounce = window.setTimeout(() => { void this.background(() => this.timer.refresh()); }, 500);
    };
    this.registerEvent(this.app.vault.on("create", onSync));
    this.registerEvent(this.app.vault.on("modify", onSync));
    this.registerEvent(this.app.vault.on("delete", onSync));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      this.invalidateSuggestions();
      void this.background(() => this.timer.renameNote(oldPath, file.path));
    }));
    this.registerEvent(this.app.metadataCache.on("changed", this.invalidateSuggestions));
    this.registerEvent(this.app.metadataCache.on("resolved", this.invalidateSuggestions));
    this.heartbeat = window.setInterval(() => { void this.background(async () => { await this.timer.tick(); await this.debug?.tick(); }); }, 1000);
    // Adapter writes / some sync providers do not immediately emit vault events.
    this.syncPoll = window.setInterval(() => { void this.background(() => this.timer.refresh()); }, 15_000);
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
    // Never cancel or pause persisted crops when the plugin / Obsidian closes.
  }

  private async background(action: () => Promise<unknown>) {
    if (this.stopped) return;
    try { await action(); this.lastError = ""; }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message !== this.lastError) { new Notice(`Solanum: ${message}`, 10_000); this.lastError = message; }
      console.error("Solanum", error);
    }
  }

  async saveSettings(settings: Settings): Promise<void> {
    const next = readSettings(settings);
    await this.saveData(next);
    this.settings = next;
    new Notice("Solanum preferences saved. Applies to new sessions.");
  }

  tags = (): string[] => {
    if (this.tagCache) return this.tagCache;
    const tags = new Set<string>();
    for (const file of this.app.vault.getMarkdownFiles()) {
      const cache = this.app.metadataCache.getFileCache(file);
      for (const tag of cache?.tags ?? []) tags.add(tag.tag.replace(/^#/, ""));
      const frontmatter = cache?.frontmatter?.tags;
      for (const tag of Array.isArray(frontmatter) ? frontmatter : typeof frontmatter === "string" ? frontmatter.split(/[,\s]+/) : []) {
        if (typeof tag === "string" && tag.trim()) tags.add(tag.trim().replace(/^#/, ""));
      }
    }
    this.tagCache = [...tags].sort();
    return this.tagCache;
  };
  private invalidateSuggestions = () => { this.tagCache = null; this.noteCache = null; };
  notes = () => {
    this.noteCache ??= this.app.vault.getMarkdownFiles().map((file) => file.path).sort();
    return this.noteCache;
  };
  activeNote = () => this.app.workspace.getActiveFile()?.path ?? null;
  openNote = (path: string) => {
    if (!this.app.vault.getAbstractFileByPath(path)) { new Notice(`Note not found: ${path}`); return; }
    void this.app.workspace.openLinkText(path, "", false);
  };
  assetUrl = (name: string) => this.app.vault.adapter.getResourcePath(`${this.manifest.dir}/assets/crops/${name}`);
  navigate = (screen: "timer" | "harvest") => { void this.background(() => this.openSidebar(screen, true)); };
  unlockAudio = () => this.audio.unlock();
  previewSound = () => { this.audio.unlock(); window.setTimeout(() => this.audio.play(this.settings.volume), 100); };

  private async openSidebar(screen: "timer" | "harvest", reveal: boolean): Promise<void> {
    const { workspace } = this.app;
    const type = screen === "timer" ? VIEW_TYPE_SOLANUM : VIEW_TYPE_HARVEST;
    let leaf = workspace.getLeavesOfType(type)[0];

    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (!rightLeaf) return;

      await rightLeaf.setViewState({ type, active: true });
      leaf = rightLeaf;
    }

    if (reveal) await workspace.revealLeaf(leaf);
  }
}

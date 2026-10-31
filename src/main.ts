import { Notice, Plugin } from "obsidian";
import { SolanumView, VIEW_TYPE_SOLANUM, VIEW_TYPE_HARVEST } from "./view";
import { TimerService } from "./timer";
import { SESSION_FOLDER, VaultSessionStore } from "./storage";
import { DEFAULT_SETTINGS, readSettings, type Settings, type SolanumHost } from "./host";
import { CompletionAudio } from "./audio";

export default class SolanumPlugin extends Plugin implements SolanumHost {
  timer!: TimerService;
  settings: Settings = { ...DEFAULT_SETTINGS };
  private audio = new CompletionAudio();
  private heartbeat: number | null = null;
  private syncPoll: number | null = null;
  private syncDebounce: number | null = null;
  private stopped = false;
  private lastError = "";

  async onload(): Promise<void> {
    this.stopped = false;
    this.settings = readSettings(await this.loadData());
    this.timer = new TimerService(new VaultSessionStore(this.app.vault.adapter), {
      now: Date.now,
      id: () => crypto.randomUUID(),
      notify: (phase) => {
        new Notice(phase === "focus" ? "Solanum: your crop is ready! Time for a break." : "Solanum: break finished. Ready to plant again?");
        if (this.settings.sound) this.audio.play(this.settings.volume);
      },
    });
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
      if (!file.path.startsWith(`${SESSION_FOLDER}/`) || this.stopped) return;
      if (this.syncDebounce !== null) window.clearTimeout(this.syncDebounce);
      this.syncDebounce = window.setTimeout(() => { void this.background(() => this.timer.refresh()); }, 500);
    };
    this.registerEvent(this.app.vault.on("create", onSync));
    this.registerEvent(this.app.vault.on("modify", onSync));
    this.registerEvent(this.app.vault.on("delete", onSync));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      void this.background(() => this.timer.renameNote(oldPath, file.path));
    }));
    this.heartbeat = window.setInterval(() => { void this.background(() => this.timer.tick()); }, 1000);
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
    const tags = new Set<string>();
    for (const file of this.app.vault.getMarkdownFiles()) {
      const cache = this.app.metadataCache.getFileCache(file);
      for (const tag of cache?.tags ?? []) tags.add(tag.tag.replace(/^#/, ""));
      const frontmatter = cache?.frontmatter?.tags;
      for (const tag of Array.isArray(frontmatter) ? frontmatter : typeof frontmatter === "string" ? frontmatter.split(/[,\s]+/) : []) {
        if (typeof tag === "string" && tag.trim()) tags.add(tag.trim().replace(/^#/, ""));
      }
    }
    return [...tags].sort();
  };
  notes = () => this.app.vault.getMarkdownFiles().map((file) => file.path).sort();
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

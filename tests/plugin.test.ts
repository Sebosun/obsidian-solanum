// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { TFile, type App, type PluginManifest } from "obsidian";

const nativeSettings = vi.hoisted(() => {
  return new Map<string, (value: string | boolean | number) => Promise<void>>();
});
const nativeUi = vi.hoisted(() => ({
  buttons: new Map<string, () => unknown>(),
  disabled: new Map<string, boolean>(),
  descriptions: new Map<string, string>(),
  inputs: new Map<string, HTMLInputElement>(),
  order: [] as string[],
  headings: new Set<string>(),
  notices: [] as string[],
  confirm: { answer: true, messages: [] as string[] },
}));
const audioSpy = vi.hoisted(() => ({
  plays: [] as { volume: number; clip: unknown }[],
  decodes: 0,
  undecodable: false,
}));
vi.mock("@/lib/audio/CompletionAudio", () => ({
  CompletionAudio: class {
    unlock() {}
    close() {}
    play(volume: number, clip: unknown = null) {
      audioSpy.plays.push({ volume, clip });
    }
    async decode(data: ArrayBuffer) {
      audioSpy.decodes += 1;
      if (audioSpy.undecodable) return null;
      return { duration: 1, bytes: data.byteLength };
    }
  },
}));
const forestDialog = vi.hoisted(() => ({
  answer: null as unknown,
  calls: [] as { preview: unknown; suggested: unknown; knownTags: string[] }[],
}));
vi.mock("@/plugin/ForestImportModal", () => ({
  askForestMapping: async (
    _app: unknown,
    preview: unknown,
    suggested: unknown,
    knownTags: string[],
  ) => {
    forestDialog.calls.push({ preview, suggested, knownTags });
    return forestDialog.answer;
  },
}));
const picker = vi.hoisted(() => ({
  text: null as string | null,
  vault: null as { path: string; text: string } | null,
  hints: 0,
}));
vi.mock("@/plugin/pickTextFile", () => ({
  pickTextFile: async (options?: { onNoDialog?: () => void }) => {
    if (picker.hints > 0) options?.onNoDialog?.();
    return picker.text;
  },
}));
vi.mock("@/plugin/pickVaultFile", () => ({ pickVaultFile: async () => picker.vault }));
vi.mock("@/plugin/ConfirmMoveModal", () => ({
  confirmMove: async (_app: unknown, message: string) => {
    nativeUi.confirm.messages.push(message);
    return nativeUi.confirm.answer;
  },
}));

vi.mock("obsidian", () => ({
  Plugin: class {
    app: unknown;
    manifest = { dir: ".obsidian/plugins/solanum" };
    constructor(app: unknown) {
      this.app = app;
    }
    registerView = vi.fn();
    addRibbonIcon = vi.fn();
    addCommand = vi.fn();
    registerEvent = vi.fn();
    registerInterval = vi.fn();
    addSettingTab = vi.fn();
    loadData = async () => null;
    saveData = vi.fn(async () => {});
  },
  Notice: class {
    constructor(message: string) {
      nativeUi.notices.push(message);
    }
    hide() {}
    setMessage(message: string) {
      void message;
    }
  },
  AbstractInputSuggest: class {},
  Modal: class {},
  TFolder: class {},
  TFile: class {
    path = "";
  },
  PluginSettingTab: class {
    containerEl = document.createElement("div");
    app: unknown;
    constructor(app: unknown) {
      this.app = app;
    }
  },
  Setting: class {
    name = "";
    setName(name: string) {
      this.name = name;
      nativeUi.order.push(name);
      return this;
    }
    setHeading() {
      nativeUi.headings.add(this.name);
      return this;
    }
    setDesc(description: string) {
      nativeUi.descriptions.set(this.name, description);
      return this;
    }
    addDropdown(callback: (control: unknown) => void) {
      return this.addControl(callback);
    }
    addText(callback: (control: unknown) => void) {
      return this.addControl(callback);
    }
    addToggle(callback: (control: unknown) => void) {
      return this.addControl(callback);
    }
    addSlider(callback: (control: unknown) => void) {
      return this.addControl(callback);
    }
    addButton(callback: (control: unknown) => void) {
      return this.addControl(callback);
    }
    addControl(callback: (control: unknown) => void) {
      const name = this.name;
      const inputEl = document.createElement("input");
      nativeUi.inputs.set(name, inputEl);
      const control = {
        inputEl,
        text: "",
        addOptions: () => control,
        setValue: () => control,
        setLimits: () => control,
        setDynamicTooltip: () => control,
        setPlaceholder: () => control,
        setCta: () => control,
        setDisabled: (disabled: boolean) => {
          nativeUi.disabled.set(control.text, disabled);
          return control;
        },
        setButtonText: (text: string) => {
          control.text = text;
          return control;
        },
        onClick: (handler: () => unknown) => {
          nativeUi.buttons.set(control.text, handler);
          nativeUi.buttons.set(`${name}/${control.text}`, handler);
          return control;
        },
        onChange: (handler: (value: string | boolean | number) => Promise<void>) => {
          nativeSettings.set(this.name, handler);
          return control;
        },
      };
      callback(control);
      return this;
    }
  },
}));
vi.mock("@/views/SolanumView", () => ({
  SolanumView: class {},
  VIEW_TYPE_SOLANUM: "solanum-timer",
  VIEW_TYPE_HARVEST: "solanum-harvest",
}));
import SolanumPlugin from "@/main";
import { getAppStore } from "@/state/appStore";
import { MemoryDisk } from "./helpers/memoryDisk";
import { readFileSync } from "node:fs";
import type { ForestMapping } from "@/lib/import/forest";

afterEach(() => {
  nativeUi.buttons.clear();
  nativeUi.disabled.clear();
  nativeUi.descriptions.clear();
  nativeUi.inputs.clear();
  nativeUi.order.length = 0;
  nativeUi.headings.clear();
  nativeUi.notices.length = 0;
  picker.text = null;
  picker.vault = null;
  picker.hints = 0;
  forestDialog.answer = null;
  forestDialog.calls.length = 0;
  audioSpy.plays.length = 0;
  audioSpy.decodes = 0;
  audioSpy.undecodable = false;
  nativeUi.confirm.answer = true;
  nativeUi.confirm.messages.length = 0;
  vi.clearAllTimers();
  vi.useRealTimers();
});

function vaultFixture() {
  const handlers: Record<string, (...args: unknown[]) => unknown> = {};
  const disk = new MemoryDisk();
  const adapter = Object.assign(disk, {
    getResourcePath: (p: string) => `app://vault/${p}`,
    readBinary: async (p: string) => {
      const text = disk.files.get(p);
      if (text === undefined) throw new Error(`ENOENT ${p}`);
      return new TextEncoder().encode(text).buffer;
    },
  });
  const app = {
    vault: {
      adapter,
      on: (name: string, cb: (...args: unknown[]) => unknown) => {
        handlers[name] = cb;
        return {};
      },
      getMarkdownFiles: vi.fn(() => [{ path: "Old.md" }]),
      getAbstractFileByPath: (p: string) =>
        disk.files.has(p) ? Object.assign(new TFile(), { path: p }) : null,
    },
    workspace: {
      onLayoutReady: vi.fn(),
      getActiveFile: () => null,
      getLeavesOfType: () => [],
      getRightLeaf: () => null,
    },
    fileManager: {
      renameFile: vi.fn(async (file: TFile, target: string) => {
        await disk.write(target, await disk.read(file.path));
        await disk.remove(file.path);
        file.path = target;
      }),
    },
    setting: { open: vi.fn(), openTabById: vi.fn() },
    metadataCache: {
      getFileCache: vi.fn(() => ({ tags: [{ tag: "#work" }] })),
      on: vi.fn(() => ({})),
    },
  } as unknown as App;
  return { app, handlers, disk };
}

describe("Obsidian lifecycle integration", () => {
  it("registers native preferences and applies saved changes only to new sessions", async () => {
    vi.useFakeTimers();
    const { app } = vaultFixture();
    const plugin = new SolanumPlugin(app, { id: "solanum" } as PluginManifest);
    await plugin.onload();
    const tab = vi.mocked(plugin.addSettingTab).mock.calls[0][0];
    tab.display();
    const ui = getAppStore(plugin);
    await nativeSettings.get("Focus duration")!("50");
    expect(ui.getState().draft.minutes).toBe(50);
    await nativeSettings.get("Break duration")!("20");
    await nativeSettings.get("Automatic breaks")!(true);
    await plugin.timer.start({
      durationMs: 5 * 60_000,
      breakMs: plugin.settings.breakMinutes * 60_000,
      autoBreak: plugin.settings.autoBreak,
      tags: [],
      notePath: null,
    });
    const active = structuredClone(plugin.timer.getState().sessions[0]);
    await nativeSettings.get("Break duration")!("5");
    expect(active.breakMs).toBe(20 * 60_000);
    expect(active.autoBreak).toBe(true);
    expect(plugin.timer.getState().sessions[0]).toEqual(active);
    expect(plugin.settings.breakMinutes).toBe(5);
    plugin.onunload();
  });

  it("changes the season theme live from the native preferences", async () => {
    vi.useFakeTimers();
    const { app } = vaultFixture();
    const plugin = new SolanumPlugin(app, { id: "solanum" } as PluginManifest);
    await plugin.onload();
    vi.mocked(plugin.addSettingTab).mock.calls[0][0].display();
    expect(getAppStore(plugin).getState().season).toBe("auto");
    await nativeSettings.get("Season theme")!("winter");
    expect(plugin.settings.season).toBe("winter");
    expect(getAppStore(plugin).getState().season).toBe("winter");
    plugin.onunload();
  });

  it("groups preferences under headings by what they change", async () => {
    vi.useFakeTimers();
    const { app } = vaultFixture();
    const plugin = new SolanumPlugin(app, { id: "solanum" } as PluginManifest);
    await plugin.onload();
    nativeUi.order.length = 0;
    nativeUi.headings.clear();
    vi.mocked(plugin.addSettingTab).mock.calls[0][0].display();
    const sections: Record<string, string[]> = {};
    let current = "";
    for (const name of nativeUi.order) {
      if (nativeUi.headings.has(name) && !(name in sections)) {
        current = name;
        sections[current] = [];
      } else sections[current].push(name);
    }
    expect(sections).toEqual({
      Timer: ["Focus presets", "Focus duration", "Break duration", "Automatic breaks"],
      Appearance: ["Season theme"],
      Sound: [
        "Completion sound",
        "Volume",
        "Focus completion sound",
        "Break completion sound",
        "Preview",
      ],
      Sessions: ["Session folder"],
      Documents: [
        "Keep documents up to date",
        "Documents folder",
        "Write documents for all history",
      ],
      Backup: [
        "Export sessions",
        "Create/update documents when importing",
        "Import sessions",
        "Import from Forest",
      ],
    });
    plugin.onunload();
  });

  describe("focus presets", () => {
    async function loaded() {
      vi.useFakeTimers();
      const { app } = vaultFixture();
      const plugin = new SolanumPlugin(app, { id: "solanum" } as PluginManifest);
      await plugin.onload();
      vi.mocked(plugin.addSettingTab).mock.calls[0][0].display();
      return plugin;
    }
    const finishEditing = (value: string) => {
      const input = nativeUi.inputs.get("Focus presets")!;
      input.value = value;
      input.dispatchEvent(new Event("change"));
    };

    it("saves an edited list when editing finishes and updates the timer at once", async () => {
      const plugin = await loaded();
      finishEditing("90, 15 ,40");
      await vi.advanceTimersByTimeAsync(0);
      expect(plugin.settings.presets).toEqual([15, 40, 90]);
      expect(getAppStore(plugin).getState().presets).toEqual([15, 40, 90]);
      plugin.onunload();
    });

    it("explains a bad list while typing and never saves it", async () => {
      const plugin = await loaded();
      await nativeSettings.get("Focus presets")!("5, banana");
      expect(nativeUi.descriptions.get("Focus presets")).toMatch(/whole numbers/i);
      finishEditing("5, banana");
      await vi.advanceTimersByTimeAsync(0);
      expect(plugin.settings.presets).toEqual([5, 10, 25, 50, 60, 90, 120]);
      await nativeSettings.get("Focus presets")!("5, 25");
      expect(nativeUi.descriptions.get("Focus presets")).toMatch(/separated by commas/i);
      plugin.onunload();
    });
  });

  it("opens its own sidebar leaf without replacing a user's existing view", async () => {
    vi.useFakeTimers();
    const { app } = vaultFixture();
    const setViewState = vi.fn(async () => {});
    const getRightLeaf = vi.fn(() => ({ setViewState }));
    app.workspace.getRightLeaf = getRightLeaf as unknown as typeof app.workspace.getRightLeaf;
    app.workspace.revealLeaf = vi.fn(async () => {});
    const plugin = new SolanumPlugin(app, {} as PluginManifest);
    await plugin.onload();
    plugin.navigate("harvest");
    await Promise.resolve();
    expect(getRightLeaf).toHaveBeenCalledWith(true);
    expect(setViewState).toHaveBeenCalledWith({ type: "solanum-harvest", active: true });
    plugin.onunload();
  });

  it("caches tag suggestions instead of scanning the vault each countdown render", async () => {
    vi.useFakeTimers();
    const { app } = vaultFixture();
    const plugin = new SolanumPlugin(app, {} as PluginManifest);
    await plugin.onload();
    plugin.tags();
    plugin.tags();
    plugin.tags();
    expect(app.metadataCache.getFileCache).toHaveBeenCalledTimes(1);
    plugin.onunload();
  });

  it("keeps crops across plugin unload and restores a deadline on the next load", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
    const { app } = vaultFixture();
    const first = new SolanumPlugin(app, {} as PluginManifest);
    await first.onload();
    await first.timer.start({
      durationMs: 5 * 60_000,
      breakMs: 5 * 60_000,
      autoBreak: false,
      tags: ["work"],
      notePath: null,
    });
    first.onunload();
    vi.setSystemTime(new Date("2026-10-31T12:03:00Z"));
    const second = new SolanumPlugin(app, {} as PluginManifest);
    await second.onload();
    const restored = second.timer.getState().sessions[0];
    expect(second.timer.remaining(restored)).toBe(2 * 60_000);
    await vi.advanceTimersByTimeAsync(2 * 60_000);
    expect(second.timer.getState().sessions[0]).toMatchObject({
      phase: "break",
      status: "waiting",
    });
    second.onunload();
  });

  it("updates note references on vault rename and exposes indexed Obsidian tags", async () => {
    vi.useFakeTimers();
    const { app, handlers } = vaultFixture();
    const plugin = new SolanumPlugin(app, {} as PluginManifest);
    await plugin.onload();
    await plugin.timer.start({
      durationMs: 5 * 60_000,
      breakMs: 5 * 60_000,
      autoBreak: false,
      tags: [],
      notePath: "Old.md",
    });
    handlers.rename({ path: "New.md" }, "Old.md");
    await plugin.timer.refresh();
    expect(plugin.timer.getState().sessions[0].notePath).toBe("New.md");
    expect(plugin.tags()).toEqual(["work"]);
    expect(plugin.assetUrl("Tomato_1.glb")).toContain(
      ".obsidian/plugins/solanum/assets/crops/Tomato_1.glb",
    );
    plugin.onunload();
  });

  describe("session folder", () => {
    const session = {
      durationMs: 5 * 60_000,
      breakMs: 5 * 60_000,
      autoBreak: false,
      tags: [],
      notePath: null,
    };
    const filesIn = (disk: MemoryDisk, folder: string) =>
      [...disk.files.keys()].filter((path) => path.startsWith(`${folder}/`));

    async function loaded(saved: unknown = null) {
      vi.useFakeTimers();
      const fixture = vaultFixture();
      const plugin = new SolanumPlugin(fixture.app, { id: "solanum" } as PluginManifest);
      plugin.loadData = async () => saved;
      await plugin.onload();
      vi.mocked(plugin.addSettingTab).mock.calls[0][0].display();
      return { ...fixture, plugin };
    }

    it("stores sessions in the saved folder", async () => {
      const { plugin, disk } = await loaded({ sessionFolder: "Assets/sessions" });
      await plugin.timer.start(session);
      expect(filesIn(disk, "Assets/sessions")).toHaveLength(1);
      expect(filesIn(disk, "Solanum/sessions")).toEqual([]);
      plugin.onunload();
    });

    it("moves existing sessions after confirmation, then saves the new folder", async () => {
      const { plugin, disk } = await loaded();
      await plugin.timer.start(session);
      nativeUi.disabled.clear();
      await nativeSettings.get("Session folder")!("Assets/sessions");
      expect(nativeUi.disabled.get("Move sessions")).toBe(false);
      await nativeUi.buttons.get("Move sessions")!();
      expect(nativeUi.confirm.messages[0]).toMatch(
        /Move 1 session file from Solanum\/sessions to Assets\/sessions/,
      );
      expect(filesIn(disk, "Assets/sessions")).toHaveLength(1);
      expect(filesIn(disk, "Solanum/sessions")).toEqual([]);
      expect(plugin.settings.sessionFolder).toBe("Assets/sessions");
      expect(plugin.saveData).toHaveBeenLastCalledWith(
        expect.objectContaining({ sessionFolder: "Assets/sessions" }),
      );
      expect(plugin.timer.getState().sessions).toHaveLength(1);
      plugin.onunload();
    });

    it("changes nothing when the move is declined", async () => {
      const { plugin, disk } = await loaded();
      await plugin.timer.start(session);
      nativeUi.confirm.answer = false;
      await nativeSettings.get("Session folder")!("Assets/sessions");
      await nativeUi.buttons.get("Move sessions")!();
      expect(filesIn(disk, "Solanum/sessions")).toHaveLength(1);
      expect(plugin.settings.sessionFolder).toBe("Solanum/sessions");
      expect(plugin.saveData).not.toHaveBeenCalled();
      plugin.onunload();
    });

    it("explains an invalid folder and blocks the move", async () => {
      const { plugin } = await loaded();
      await nativeSettings.get("Session folder")!(".obsidian/sessions");
      expect(nativeUi.disabled.get("Move sessions")).toBe(true);
      expect(nativeUi.descriptions.get("Session folder")).toMatch(/hidden/i);
      await nativeSettings.get("Session folder")!("Solanum/sessions");
      expect(nativeUi.disabled.get("Move sessions")).toBe(true);
      plugin.onunload();
    });

    it("reports a conflicting destination without moving or saving anything", async () => {
      const { plugin, disk } = await loaded();
      await plugin.timer.start(session);
      const [source] = filesIn(disk, "Solanum/sessions");
      disk.folders.add("Assets");
      disk.folders.add("Assets/sessions");
      disk.files.set(`Assets/sessions/${source.split("/").pop()}`, "someone else's data");
      await nativeSettings.get("Session folder")!("Assets/sessions");
      await nativeUi.buttons.get("Move sessions")!();
      expect(nativeUi.confirm.messages).toEqual([]);
      expect(nativeUi.notices.join(" ")).toMatch(/Nothing was moved/);
      expect(disk.files.has(source)).toBe(true);
      expect(plugin.settings.sessionFolder).toBe("Solanum/sessions");
      plugin.onunload();
    });

    it("cannot change the folder through ordinary settings saves", async () => {
      const { plugin } = await loaded();
      await plugin.saveSettings({ ...plugin.settings, sessionFolder: "Elsewhere", volume: 0.1 });
      expect(plugin.settings).toMatchObject({ sessionFolder: "Solanum/sessions", volume: 0.1 });
      plugin.onunload();
    });

    it("follows a folder change synced from another device and merges its leftovers", async () => {
      const { plugin, disk } = await loaded();
      await plugin.timer.start(session);
      expect(filesIn(disk, "Solanum/sessions")).toHaveLength(1);
      plugin.loadData = async () => ({ sessionFolder: "Assets/sessions" });
      await plugin.onExternalSettingsChange();
      expect(plugin.settings.sessionFolder).toBe("Assets/sessions");
      expect(filesIn(disk, "Assets/sessions")).toHaveLength(1);
      expect(filesIn(disk, "Solanum/sessions")).toEqual([]);
      expect(nativeUi.notices.join(" ")).toMatch(/Assets\/sessions/);
      plugin.onunload();
    });

    it("refreshes when files change in the configured folder, not the default one", async () => {
      const { plugin, handlers, disk } = await loaded({ sessionFolder: "Assets/sessions" });
      const refresh = vi.spyOn(plugin.timer, "refresh");
      handlers.create({ path: "Solanum/sessions/x.json" });
      await vi.advanceTimersByTimeAsync(600);
      expect(refresh).not.toHaveBeenCalled();
      handlers.create({ path: `Assets/sessions/${[...disk.files.keys()].length}.json` });
      await vi.advanceTimersByTimeAsync(600);
      expect(refresh).toHaveBeenCalled();
      plugin.onunload();
    });
  });

  describe("backup", () => {
    const session = {
      durationMs: 5 * 60_000,
      breakMs: 5 * 60_000,
      autoBreak: false,
      tags: ["study"],
      notePath: null,
    };
    async function loaded() {
      vi.useFakeTimers();
      const fixture = vaultFixture();
      const plugin = new SolanumPlugin(fixture.app, { id: "solanum" } as PluginManifest);
      await plugin.onload();
      vi.mocked(plugin.addSettingTab).mock.calls[0][0].display();
      return { ...fixture, plugin };
    }

    it("exports the history to a vault file and says where", async () => {
      const { plugin, disk } = await loaded();
      await plugin.timer.start(session);
      await nativeUi.buttons.get("Export")!();
      const file = [...disk.files.keys()].find((path) => path.startsWith("Solanum/exports/"));
      expect(file).toMatch(/solanum-sessions-\d{4}-\d{2}-\d{2}\.json$/);
      expect(nativeUi.notices.join(" ")).toContain(file);
      plugin.onunload();
    });

    it("imports a chosen file into the live history and summarises it", async () => {
      const { plugin, disk } = await loaded();
      await plugin.timer.start(session);
      await nativeUi.buttons.get("Export")!();
      const file = [...disk.files.keys()].find((path) => path.startsWith("Solanum/exports/"))!;
      const text = disk.files.get(file)!;
      const { plugin: other } = await loaded();
      picker.text = text;
      await nativeUi.buttons.get("Import…")!();
      expect(other.timer.getState().sessions).toHaveLength(1);
      expect(nativeUi.notices.join(" ")).toMatch(/Imported 1 revision\./);
      other.onunload();
      plugin.onunload();
    });

    it("imports a session file chosen from the vault when the system dialog is unavailable", async () => {
      const { plugin, disk } = await loaded();
      await plugin.timer.start(session);
      await nativeUi.buttons.get("Export")!();
      const file = [...disk.files.keys()].find((path) => path.startsWith("Solanum/exports/"))!;
      const { plugin: other } = await loaded();
      picker.vault = { path: file, text: disk.files.get(file)! };
      await nativeUi.buttons.get("From vault…")!();
      expect(other.timer.getState().sessions).toHaveLength(1);
      picker.vault = null;
      nativeUi.notices.length = 0;
      await nativeUi.buttons.get("From vault…")!();
      expect(nativeUi.notices).toEqual([]);
      other.onunload();
      plugin.onunload();
    });

    it("points to the vault picker when the system dialog never opens", async () => {
      const { plugin } = await loaded();
      picker.hints = 1;
      await nativeUi.buttons.get("Import…")!();
      expect(nativeUi.notices.join(" ")).toMatch(/From vault/);
      plugin.onunload();
    });

    it("explains an unusable file and ignores a cancelled picker", async () => {
      const { plugin } = await loaded();
      picker.text = null;
      await nativeUi.buttons.get("Import…")!();
      expect(nativeUi.notices).toEqual([]);
      picker.text = "definitely not json";
      await nativeUi.buttons.get("Import…")!();
      expect(nativeUi.notices.join(" ")).toMatch(/not a valid Solanum export/i);
      expect(plugin.timer.getState().sessions).toEqual([]);
      plugin.onunload();
    });
  });

  describe("custom completion sounds", () => {
    async function loaded(saved: unknown = null, files: Record<string, string> = {}) {
      vi.useFakeTimers();
      const fixture = vaultFixture();
      for (const [path, text] of Object.entries(files)) fixture.disk.files.set(path, text);
      const plugin = new SolanumPlugin(fixture.app, { id: "solanum" } as PluginManifest);
      plugin.loadData = async () => saved;
      await plugin.onload();
      vi.mocked(plugin.addSettingTab).mock.calls[0][0].display();
      return { ...fixture, plugin };
    }
    const shortCrop = {
      durationMs: 60_000,
      breakMs: 60_000,
      autoBreak: true,
      tags: [],
      notePath: null,
    };
    async function finishFocusAndBreak(plugin: SolanumPlugin) {
      await plugin.timer.start(shortCrop);
      await vi.advanceTimersByTimeAsync(61_000);
      await vi.advanceTimersByTimeAsync(61_000);
    }

    it("plays the built-in chime by default, at the saved volume", async () => {
      const { plugin } = await loaded({ volume: 0.7 });
      await finishFocusAndBreak(plugin);
      expect(audioSpy.plays).toEqual([
        { volume: 0.7, clip: null },
        { volume: 0.7, clip: null },
      ]);
      plugin.onunload();
    });

    it("plays the chosen file for each phase and decodes it only once", async () => {
      const { plugin } = await loaded(
        { focusSound: "Sounds/focus.mp3", breakSound: "Sounds/break.wav" },
        { "Sounds/focus.mp3": "focus-bytes", "Sounds/break.wav": "break-bytes!" },
      );
      await finishFocusAndBreak(plugin);
      expect(audioSpy.plays).toHaveLength(2);
      expect(audioSpy.plays[0].clip).toMatchObject({ bytes: "focus-bytes".length });
      expect(audioSpy.plays[1].clip).toMatchObject({ bytes: "break-bytes!".length });
      expect(audioSpy.decodes).toBe(2);
      plugin.onunload();
    });

    it("falls back to the chime and says why when the file is gone", async () => {
      const { plugin } = await loaded({ focusSound: "Sounds/missing.mp3" });
      await finishFocusAndBreak(plugin);
      expect(audioSpy.plays.map((play) => play.clip)).toEqual([null, null]);
      const warnings = nativeUi.notices.filter((notice) => notice.includes("Sounds/missing.mp3"));
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatch(/could not be read/i);
      plugin.onunload();
    });

    it("re-reads a sound that changed in the vault", async () => {
      const { plugin, handlers, disk } = await loaded(
        { focusSound: "Sounds/focus.mp3" },
        { "Sounds/focus.mp3": "old" },
      );
      const first = await plugin.timer.start({ ...shortCrop, autoBreak: false });
      await vi.advanceTimersByTimeAsync(61_000);
      expect(audioSpy.plays[0].clip).toMatchObject({ bytes: 3 });
      await plugin.timer.cancel(first);
      disk.files.set("Sounds/focus.mp3", "much-longer");
      handlers.modify({ path: "Sounds/focus.mp3" });
      await plugin.timer.start({ ...shortCrop, autoBreak: false });
      await vi.advanceTimersByTimeAsync(61_000);
      expect(audioSpy.plays[1].clip).toMatchObject({ bytes: "much-longer".length });
      plugin.onunload();
    });

    it("stays silent with the sound toggle off, but still previews on request", async () => {
      const { plugin } = await loaded(
        { sound: false, focusSound: "Sounds/focus.mp3" },
        {
          "Sounds/focus.mp3": "x",
        },
      );
      await finishFocusAndBreak(plugin);
      expect(audioSpy.plays).toEqual([]);
      plugin.previewSound("focus");
      await vi.advanceTimersByTimeAsync(200);
      expect(audioSpy.plays).toHaveLength(1);
      plugin.onunload();
    });

    it("saves a valid vault file chosen in settings and previews each phase", async () => {
      const { plugin } = await loaded(null, { "Sounds/ding.mp3": "ding" });
      await nativeSettings.get("Focus completion sound")!("Sounds/ding.mp3");
      expect(plugin.settings.focusSound).toBe("Sounds/ding.mp3");
      expect(plugin.saveData).toHaveBeenLastCalledWith(
        expect.objectContaining({ focusSound: "Sounds/ding.mp3" }),
      );
      await nativeUi.buttons.get("Focus completion sound/Test")!();
      await vi.advanceTimersByTimeAsync(200);
      expect(audioSpy.plays[audioSpy.plays.length - 1]?.clip).toMatchObject({ bytes: 4 });
      await nativeUi.buttons.get("Break completion sound/Test")!();
      await vi.advanceTimersByTimeAsync(200);
      expect(audioSpy.plays[audioSpy.plays.length - 1]?.clip).toBeNull();
      plugin.onunload();
    });

    it("rejects files that are not audio or not in the vault, and can reset to the chime", async () => {
      const { plugin } = await loaded(
        { focusSound: "Sounds/ding.mp3" },
        {
          "Sounds/ding.mp3": "ding",
          "notes.md": "text",
        },
      );
      await nativeSettings.get("Focus completion sound")!("notes.md");
      expect(nativeUi.descriptions.get("Focus completion sound")).toMatch(/audio file/i);
      await nativeSettings.get("Focus completion sound")!("Sounds/nope.mp3");
      expect(nativeUi.descriptions.get("Focus completion sound")).toMatch(/not in the vault/i);
      expect(plugin.settings.focusSound).toBe("Sounds/ding.mp3");
      await nativeSettings.get("Focus completion sound")!("");
      expect(plugin.settings.focusSound).toBe("");
      plugin.onunload();
    });
  });

  describe("day notes", () => {
    const crop = (tags: string[], minutes = 5) => ({
      durationMs: minutes * 60_000,
      breakMs: 5 * 60_000,
      autoBreak: false,
      tags,
      notePath: null,
    });
    const notesIn = (disk: MemoryDisk) =>
      [...disk.files.keys()].filter((path) => /^Solanum\/\d{4}\/\d{2}\/.*\.md$/.test(path));

    describe("legacy imports", () => {
      const sample = readFileSync("tests/fixtures/forest-sample.csv", "utf8");
      const mapping: ForestMapping = {
        tags: {},
        trees: { Bush: "tomato", Cedar: "carrot", "Statue of Tada": "corn" },
      };
      const choose = () => nativeUi.buttons.get("Choose CSV…")!();

      it("uses the same calendar system when a legacy-configured live session changes", async () => {
        const { plugin, disk } = await loaded({ dayNotesFolder: "Solanum/days" });
        await workAMinute(plugin);
        expect(plugin.settings.dayNotesLayout).toBe("calendar");
        expect(notesIn(disk)).toEqual(["Solanum/2026/10/2026-10-31.md"]);
        expect([...disk.files.keys()].some((path) => path.startsWith("Solanum/days/"))).toBe(false);
        plugin.onunload();
      });

      it("uses the same preview and migration when restoring a legacy-configured backup", async () => {
        const { plugin, disk } = await loaded({ dayNotesFolder: "Solanum/days" });
        await plugin.importForest(sample, { ...mapping, createDocuments: false });
        await disk.mkdir("Solanum/days");
        disk.files.set(
          "Solanum/days/2021-07-28.md",
          "---\nsolanum: day\ndate: 2021-07-28\n---\n## Notes\nBackup reflection.\n",
        );
        const exported = await plugin.exportSessions();
        picker.text = await disk.read(exported.path);
        await nativeUi.buttons.get("Import…")!();
        expect(nativeUi.confirm.messages).toHaveLength(1);
        expect(plugin.settings).toMatchObject({
          dayNotesFolder: "Solanum",
          dayNotesLayout: "calendar",
        });
        expect(disk.files.get("Solanum/2021/07/2021-07-28.md")).toContain("Backup reflection.");
        expect([...disk.files.keys()].some((path) => path.startsWith("Solanum/days/"))).toBe(false);
        plugin.onunload();
      });

      it("upgrades legacy Forest imports and moves existing documents without losing personal notes", async () => {
        const { plugin, disk, app } = await loaded({ dayNotesFolder: "Solanum/days" });
        await disk.mkdir("Solanum/days");
        const original =
          "---\nsolanum: day\ndate: 2021-07-28\n---\n## Notes\nKeep my reflection.\n";
        disk.files.set("Solanum/days/2021-07-28.md", original);
        // Reproduce a vault where the CSV was already imported before the layout fix.
        await plugin.importForest(sample, { ...mapping, createDocuments: false });
        picker.text = sample;
        forestDialog.answer = mapping;
        await choose();
        expect(nativeUi.confirm.messages).toHaveLength(1);
        expect(nativeUi.confirm.messages[0]).toContain("Solanum/2021/07/2021-07-28.md");
        expect(app.fileManager.renameFile).toHaveBeenCalledOnce();
        expect(plugin.settings).toMatchObject({
          dayNotesFolder: "Solanum",
          dayNotesLayout: "calendar",
        });
        expect(disk.files.has("Solanum/days/2021-07-28.md")).toBe(false);
        expect(disk.files.get("Solanum/2021/07/2021-07-28.md")).toContain("Keep my reflection.");
        expect(notesIn(disk).length).toBeGreaterThan(1);
        await vi.advanceTimersByTimeAsync(5_000);
        expect([...disk.files.keys()].some((path) => path.startsWith("Solanum/days/"))).toBe(false);
        await choose();
        expect(plugin.timer.getState().sessions).toHaveLength(17);
        expect(nativeUi.confirm.messages).toHaveLength(1);
        plugin.onunload();
      });

      it("does not import or move anything if the import migration preview is cancelled", async () => {
        const { plugin, disk, app } = await loaded({ dayNotesFolder: "Solanum/days" });
        await disk.mkdir("Solanum/days");
        const original = "---\nsolanum: day\ndate: 2021-07-28\n---\n## Notes\nKeep this.\n";
        disk.files.set("Solanum/days/2021-07-28.md", original);
        nativeUi.confirm.answer = false;
        picker.text = sample;
        forestDialog.answer = mapping;
        await choose();
        expect(plugin.timer.getState().sessions).toEqual([]);
        expect(app.fileManager.renameFile).not.toHaveBeenCalled();
        expect(disk.files.get("Solanum/days/2021-07-28.md")).toBe(original);
        plugin.onunload();
      });

      it("upgrades a legacy custom root on direct import and keeps imported history safe on collisions", async () => {
        const { plugin, disk } = await loaded({ dayNotesFolder: "Journal/Focus" });
        await disk.mkdir("Journal/Focus");
        const original = "---\nsolanum: day\ndate: 2021-07-28\n---\n## Notes\nKeep this.\n";
        disk.files.set("Journal/Focus/2021-07-28.md", original);
        disk.files.set("Journal/Focus/2021/07/2021-07-28.md", "Do not overwrite me.");
        const failed = await plugin.importForest(sample, mapping);
        expect(failed.imported.added).toBe(17);
        expect(failed.imported.documents?.failures).toHaveLength(1);
        expect(disk.files.get("Journal/Focus/2021/07/2021-07-28.md")).toBe("Do not overwrite me.");
        disk.files.delete("Journal/Focus/2021/07/2021-07-28.md");
        const retry = await plugin.importForest(sample, mapping);
        expect(retry.imported.duplicates).toBe(17);
        expect(retry.imported.documents?.failures).toEqual([]);
        expect(plugin.settings).toMatchObject({
          dayNotesFolder: "Journal/Focus",
          dayNotesLayout: "calendar",
        });
        expect(disk.files.has("Journal/Focus/2021-07-28.md")).toBe(false);
        expect(disk.files.get("Journal/Focus/2021/07/2021-07-28.md")).toContain("Keep this.");
        plugin.onunload();
      });
    });

    async function loaded(saved: unknown = null) {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 9, 31, 12));
      const fixture = vaultFixture();
      const openLinkText = vi.fn(async () => {});
      (fixture.app.workspace as unknown as { openLinkText: unknown }).openLinkText = openLinkText;
      const plugin = new SolanumPlugin(fixture.app, { id: "solanum" } as PluginManifest);
      plugin.loadData = async () => saved;
      await plugin.onload();
      vi.mocked(plugin.addSettingTab).mock.calls[0][0].display();
      return { ...fixture, plugin, openLinkText };
    }
    /** Plants a crop, works for a minute and pauses, which is the earliest a note is worth writing. */
    async function workAMinute(plugin: SolanumPlugin) {
      const id = await plugin.timer.start(crop(["study"]));
      await vi.advanceTimersByTimeAsync(61_000);
      await plugin.timer.pause(id);
      await vi.advanceTimersByTimeAsync(2_000);
      return id;
    }
    const commandNamed = (plugin: SolanumPlugin, id: string) => {
      const call = vi.mocked(plugin.addCommand).mock.calls.find(([command]) => command.id === id);
      if (!call?.[0].callback) throw new Error(`No command ${id}`);
      return call[0].callback;
    };

    it("writes today's note when a crop is paused and again when it is harvested", async () => {
      const { plugin, disk } = await loaded();
      const id = await plugin.timer.start(crop(["study"]));
      await vi.advanceTimersByTimeAsync(2_000);
      expect(notesIn(disk)).toEqual([]);
      await vi.advanceTimersByTimeAsync(60_000);
      await plugin.timer.pause(id);
      expect(notesIn(disk)).toEqual([]);
      await vi.advanceTimersByTimeAsync(2_000);
      expect(notesIn(disk)).toEqual(["Solanum/2026/10/2026-10-31.md"]);
      expect(disk.files.get("Solanum/2026/10/2026-10-31.md")).toContain("| Growing |");
      await plugin.timer.resume(id);
      await vi.advanceTimersByTimeAsync(5 * 60_000 + 3_000);
      expect(disk.files.get("Solanum/2026/10/2026-10-31.md")).toContain("| Harvested |");
      plugin.onunload();
    });

    it("does not rewrite notes for existing history when the plugin starts", async () => {
      const first = await loaded();
      await workAMinute(first.plugin);
      expect(notesIn(first.disk)).toEqual(["Solanum/2026/10/2026-10-31.md"]);
      first.plugin.onunload();
      first.disk.files.delete("Solanum/2026/10/2026-10-31.md");
      const second = new SolanumPlugin(first.app, { id: "solanum" } as PluginManifest);
      await second.onload();
      await vi.advanceTimersByTimeAsync(5_000);
      expect(notesIn(first.disk)).toEqual([]);
      second.onunload();
    });

    it("stays quiet when day notes are switched off, but still opens one on request", async () => {
      const { plugin, disk, openLinkText } = await loaded({ dayNotes: false });
      await workAMinute(plugin);
      expect(notesIn(disk)).toEqual([]);
      await plugin.openDayNote(new Date(2026, 9, 31));
      expect(notesIn(disk)).toEqual(["Solanum/2026/10/2026-10-31.md"]);
      expect(openLinkText).toHaveBeenCalledWith("Solanum/2026/10/2026-10-31.md", "", false);
      plugin.onunload();
    });

    it("tells the user instead of creating an empty note", async () => {
      const { plugin, disk, openLinkText } = await loaded();
      await plugin.openDayNote(new Date(2026, 9, 30));
      expect(notesIn(disk)).toEqual([]);
      expect(openLinkText).not.toHaveBeenCalled();
      expect(nativeUi.notices.join(" ")).toMatch(/no focused time on 2026-10-30/i);
      plugin.onunload();
    });

    it("uses the configured folder", async () => {
      const { plugin, disk } = await loaded({
        dayNotesFolder: "Journal/Focus",
        dayNotesLayout: "calendar",
      });
      await workAMinute(plugin);
      expect([...disk.files.keys()]).toContain("Journal/Focus/2026/10/2026-10-31.md");
      plugin.onunload();
    });

    it("opens today's note from the command palette and backfills all history on demand", async () => {
      const { plugin, disk, openLinkText } = await loaded({ dayNotes: false });
      const id = await plugin.timer.start(crop(["a"]));
      vi.setSystemTime(new Date(2026, 9, 31, 12, 5));
      await plugin.timer.cancel(id);
      vi.setSystemTime(new Date(2026, 10, 2, 9));
      await plugin.timer.start(crop(["b"]));
      vi.setSystemTime(new Date(2026, 10, 2, 9, 5));
      await commandNamed(plugin, "open-today-note")();
      await vi.advanceTimersByTimeAsync(10);
      expect(openLinkText).toHaveBeenCalledWith("Solanum/2026/11/2026-11-02.md", "", false);
      await nativeUi.buttons.get("Write documents for all history")!();
      expect(notesIn(disk).sort()).toEqual([
        "Solanum/2026/10/2026-10-31.md",
        "Solanum/2026/11/2026-11-02.md",
      ]);
      expect(nativeUi.notices.join(" ")).toMatch(/Documents: 1 new, 0 updated, 1 unchanged/);
      plugin.onunload();
    });

    it("saves the day notes settings, rejecting folders that cannot work", async () => {
      const { plugin } = await loaded();
      await nativeSettings.get("Keep documents up to date")!(false);
      expect(plugin.settings.dayNotes).toBe(false);
      await nativeSettings.get("Documents folder")!(".hidden/days");
      expect(nativeUi.descriptions.get("Documents folder")).toMatch(/hidden/i);
      expect(plugin.settings.dayNotesFolder).toBe("Solanum");
      await nativeSettings.get("Documents folder")!("Journal/Focus");
      expect(plugin.settings.dayNotesFolder).toBe("Journal/Focus");
      plugin.onunload();
    });

    it.each(["flat", "calendar"])(
      "shows one document system regardless of saved %s metadata",
      async (layout) => {
        const { plugin } = await loaded({
          dayNotesFolder: "assets/solanum",
          dayNotesLayout: layout,
        });
        expect(nativeUi.headings.has("Documents")).toBe(true);
        expect(nativeUi.descriptions.get("Documents folder")).toContain("YYYY/MM/YYYY-MM-DD.md");
        expect([...nativeUi.descriptions.values()].join(" ")).not.toMatch(
          /legacy|flat layout|migration/i,
        );
        expect(nativeUi.order).not.toContain("Organize notes by year/month");
        expect(nativeUi.buttons.has("Preview migration…")).toBe(false);
        expect(nativeUi.buttons.has("Resume migration…")).toBe(false);
        plugin.onunload();
      },
    );

    it("recovers an interrupted document update with the normal write-history action", async () => {
      const { plugin } = await loaded({
        dayNotesFolder: "assets/solanum",
        dayNotesLayout: "flat",
        dayNotesMigrationRoot: "assets/solanum",
      });
      expect(nativeUi.descriptions.get("Documents folder")).toMatch(/update was interrupted/);
      expect(nativeUi.descriptions.get("Documents folder")).not.toMatch(/legacy|migration/i);
      await nativeUi.buttons.get("Write documents for all history")!();
      expect(plugin.settings.dayNotesMigrationRoot).toBe(null);
      expect(nativeUi.descriptions.get("Documents folder")).toContain("YYYY/MM/YYYY-MM-DD.md");
      expect(nativeUi.descriptions.get("Documents folder")).not.toMatch(/interrupted/);
      plugin.onunload();
    });

    it("never writes flat documents after interrupted migration and resumes after restart", async () => {
      const { plugin, disk, app } = await loaded({ dayNotesFolder: "Journal/Focus" });
      await disk.mkdir("Journal/Focus");
      disk.files.set(
        "Journal/Focus/2026-10-31.md",
        "---\nsolanum: day\ndate: 2026-10-31\n---\n## Notes\nKeep this.\n",
      );
      disk.failWrites.add("Journal/Focus/2026/10/2026-10-31.md");
      await expect(plugin.writeAllDayNotes()).rejects.toThrow(/Retry the document update/);
      expect(plugin.settings.dayNotesMigrationRoot).toBe("Journal/Focus");
      const saved = { ...plugin.settings };
      plugin.onunload();
      const restarted = new SolanumPlugin(app, { id: "solanum" } as PluginManifest);
      restarted.loadData = async () => saved;
      await restarted.onload();
      await expect(restarted.writeAllDayNotes()).rejects.toThrow(/Retry the document update/);
      disk.failWrites.clear();
      await restarted.writeAllDayNotes();
      expect(restarted.settings).toMatchObject({
        dayNotesFolder: "Journal/Focus",
        dayNotesLayout: "calendar",
        dayNotesMigrationRoot: null,
      });
      expect(disk.files.has("Journal/Focus/2026-10-31.md")).toBe(false);
      await restarted.writeAllDayNotes();
      restarted.onunload();
    });
  });

  describe("Forest import", () => {
    const sample = readFileSync("tests/fixtures/forest-sample.csv", "utf8");
    const mapping: ForestMapping = {
      tags: { Study: "university", Latin: "" },
      trees: { Bush: "carrot", Cedar: "pumpkin", "Statue of Tada": "tomato" },
    };
    async function loaded() {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 9, 31, 12));
      const fixture = vaultFixture();
      const plugin = new SolanumPlugin(fixture.app, { id: "solanum" } as PluginManifest);
      await plugin.onload();
      vi.mocked(plugin.addSettingTab).mock.calls[0][0].display();
      return { ...fixture, plugin };
    }
    const choose = () => nativeUi.buttons.get("Choose CSV…")!();
    const notesIn = (disk: MemoryDisk) =>
      [...disk.files.keys()].filter((path) => /^Solanum\/\d{4}\/\d{2}\/.*\.md$/.test(path));

    it("imports a Forest CSV chosen from the vault", async () => {
      const { plugin } = await loaded();
      picker.vault = { path: "forest.csv", text: sample };
      forestDialog.answer = mapping;
      await nativeUi.buttons.get("CSV from vault…")!();
      expect(plugin.timer.getState().sessions).toHaveLength(17);
      plugin.onunload();
    });

    it("asks which tag and plant each Forest one becomes, with sensible suggestions", async () => {
      const { plugin } = await loaded();
      picker.text = sample;
      forestDialog.answer = mapping;
      await choose();
      expect(forestDialog.calls).toHaveLength(1);
      const [call] = forestDialog.calls;
      expect(call.preview).toMatchObject({
        successful: 17,
        failed: 1,
        tags: [
          { name: "Study", count: 16 },
          { name: "Latin", count: 1 },
        ],
      });
      expect(call.suggested).toEqual({
        tags: { Study: "Study", Latin: "Latin" },
        trees: { Bush: "tomato", Cedar: "carrot", "Statue of Tada": "corn" },
      });
      plugin.onunload();
    });

    it("imports the finished trees with the chosen tags and plants, and says what it did", async () => {
      const { plugin } = await loaded();
      picker.text = sample;
      forestDialog.answer = mapping;
      await choose();
      const sessions = plugin.timer.getState().sessions;
      expect(sessions).toHaveLength(17);
      const first = sessions[sessions.length - 1]; // newest first, so the oldest is last
      expect(first.startedAt).toBe(Date.UTC(2021, 6, 28, 10, 53, 32));
      expect(first).toMatchObject({ crop: "carrot", tags: ["university"], status: "completed" });
      expect(sessions[0].tags).toEqual([]); // Latin was mapped to no tag
      expect(sessions.filter((session) => session.crop === "pumpkin")).toHaveLength(6);
      expect(nativeUi.notices.join(" ")).toContain(
        "Imported 17 sessions from Forest. 1 stopped session was skipped.",
      );
      plugin.onunload();
    });

    it("importing the same file again adds nothing", async () => {
      const { plugin } = await loaded();
      picker.text = sample;
      forestDialog.answer = mapping;
      await choose();
      nativeUi.notices.length = 0;
      await choose();
      expect(plugin.timer.getState().sessions).toHaveLength(17);
      expect(nativeUi.notices.join(" ")).toContain(
        "Nothing new to import. 17 sessions were already here.",
      );
      plugin.onunload();
    });

    it("changes nothing if the dialog is cancelled or no file is chosen", async () => {
      const { plugin } = await loaded();
      picker.text = null;
      await choose();
      picker.text = sample;
      forestDialog.answer = null;
      await choose();
      expect(plugin.timer.getState().sessions).toEqual([]);
      expect(nativeUi.notices).toEqual([]);
      plugin.onunload();
    });

    it("explains a file that is not a Forest export, or has nothing finished, without asking anything", async () => {
      const { plugin } = await loaded();
      picker.text = "name,value\nfoo,1\n";
      await choose();
      expect(nativeUi.notices.join(" ")).toMatch(/does not look like a Forest export/i);
      picker.text =
        '"Start Time","End Time","Tag","Note","Tree Type","Is Success"\n"Mon Sep 06 18:31:17 GMT+02:00 2021","Mon Sep 06 18:31:49 GMT+02:00 2021","Study","","Cedar","False"\n';
      await choose();
      expect(nativeUi.notices.join(" ")).toMatch(/no finished sessions/i);
      expect(forestDialog.calls).toEqual([]);
      expect(plugin.timer.getState().sessions).toEqual([]);
      plugin.onunload();
    });

    it("links a Forest note only when it names a note in the vault", async () => {
      const { plugin, app } = await loaded();
      (
        app.vault.getMarkdownFiles as unknown as { mockReturnValue(files: unknown): void }
      ).mockReturnValue([{ path: "Projects/Alpha.md" }]);
      plugin.onunload();
      const again = new SolanumPlugin(app, { id: "solanum" } as PluginManifest);
      await again.onload();
      vi.mocked(again.addSettingTab).mock.calls[0][0].display();
      picker.text =
        '"Start Time","End Time","Tag","Note","Tree Type","Is Success"\n' +
        '"Wed Jul 28 12:00:00 GMT+02:00 2021","Wed Jul 28 12:25:00 GMT+02:00 2021","","Alpha","Bush","True"\n' +
        '"Wed Jul 28 13:00:00 GMT+02:00 2021","Wed Jul 28 13:25:00 GMT+02:00 2021","","just a thought","Bush","True"\n';
      forestDialog.answer = { tags: {}, trees: { Bush: "tomato" } };
      await choose();
      const paths = again.timer.getState().sessions.map((session) => session.notePath);
      expect(paths.sort()).toEqual(["Projects/Alpha.md", null]);
      expect(nativeUi.notices.join(" ")).toMatch(
        /1 note did not match a note in your vault and was left out/,
      );
      again.onunload();
    });

    it("writes documents for every imported day, including imports spanning more than 14 days", async () => {
      const { plugin, disk } = await loaded();
      const rows = Array.from({ length: 20 }, (_, i) => {
        const day = String(i + 1).padStart(2, "0");
        return `"Mon Mar ${i + 1} 12:00:00 GMT+00:00 2021","Mon Mar ${i + 1} 12:25:00 GMT+00:00 2021","","","Bush","True"`.replace(
          "Mar " + (i + 1),
          "Mar " + day,
        );
      }).join("\n");
      picker.text = `"Start Time","End Time","Tag","Note","Tree Type","Is Success"\n${rows}\n`;
      forestDialog.answer = { tags: {}, trees: { Bush: "tomato" } };
      await choose();
      await vi.advanceTimersByTimeAsync(5_000);
      expect(plugin.timer.getState().sessions).toHaveLength(20);
      expect(notesIn(disk)).toHaveLength(20);
      await nativeUi.buttons.get("Write documents for all history")!();
      expect(notesIn(disk)).toHaveLength(20);
      plugin.onunload();
    });

    it("repairs a missing document on duplicate import without duplicating sessions", async () => {
      const { plugin, disk } = await loaded();
      picker.text = sample;
      forestDialog.answer = mapping;
      await choose();
      const paths = notesIn(disk);
      expect(paths.length).toBeGreaterThan(0);
      disk.files.delete(paths[0]);
      await choose();
      expect(plugin.timer.getState().sessions).toHaveLength(17);
      expect(notesIn(disk).sort()).toEqual(paths.sort());
      plugin.onunload();
    });

    it("creates import documents even when automatic notes are off, and supports opting out", async () => {
      const { plugin, disk } = await loaded();
      await plugin.saveSettings({ ...plugin.settings, dayNotes: false });
      const skipped = await plugin.importForest(sample, { ...mapping, createDocuments: false });
      expect(skipped.imported.added).toBe(17);
      await vi.advanceTimersByTimeAsync(5_000);
      expect(notesIn(disk)).toEqual([]);
      const repaired = await plugin.importForest(sample, mapping);
      expect(repaired.imported.duplicates).toBe(17);
      expect(repaired.imported.documents?.created).toBeGreaterThan(0);
      expect(notesIn(disk).length).toBeGreaterThan(0);
      plugin.onunload();
    });

    it("keeps imported sessions when a document fails, continues, and repairs on retry", async () => {
      const { plugin, disk } = await loaded();
      const first = await plugin.importForest(sample, { ...mapping, createDocuments: false });
      const day = new Date(plugin.timer.getState().sessions[0].startedAt);
      const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      const path = `Solanum/${date.slice(0, 4)}/${date.slice(5, 7)}/${date}.md`;
      disk.failWrites.add(path);
      const failed = await plugin.importForest(sample, mapping);
      expect(first.imported.added).toBe(17);
      expect(failed.imported.documents?.failures).toHaveLength(1);
      expect(failed.imported.documents?.created).toBeGreaterThan(0);
      expect(plugin.timer.getState().sessions).toHaveLength(17);
      disk.failWrites.clear();
      const retry = await plugin.importForest(sample, mapping);
      expect(retry.imported.documents?.failures).toEqual([]);
      expect(disk.files.has(path)).toBe(true);
      plugin.onunload();
    });

    it("uses the same repair pipeline for a Solanum backup and reports progress", async () => {
      const { plugin, disk } = await loaded();
      await plugin.importForest(sample, { ...mapping, createDocuments: false });
      const exported = await plugin.exportSessions();
      const progress: [number, number][] = [];
      const result = await plugin.importSessions(await disk.read(exported.path), {
        onDocumentProgress: (done, total) => progress.push([done, total]),
      });
      expect(result.added).toBe(0);
      expect(result.documents?.created).toBeGreaterThan(0);
      expect(progress[progress.length - 1]).toEqual([notesIn(disk).length, notesIn(disk).length]);
      plugin.onunload();
    });
  });
});

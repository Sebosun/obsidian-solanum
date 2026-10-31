// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { App, PluginManifest } from "obsidian";

const nativeSettings = vi.hoisted(() => {
  return new Map<string, (value: string | boolean | number) => Promise<void>>();
});
const nativeUi = vi.hoisted(() => ({
  buttons: new Map<string, () => unknown>(),
  disabled: new Map<string, boolean>(),
  descriptions: new Map<string, string>(),
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
const picker = vi.hoisted(() => ({ text: null as string | null }));
vi.mock("@/plugin/pickTextFile", () => ({ pickTextFile: async () => picker.text }));
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
  },
  AbstractInputSuggest: class {},
  Modal: class {},
  TFolder: class {},
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
      const control = {
        inputEl: document.createElement("input"),
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

afterEach(() => {
  nativeUi.buttons.clear();
  nativeUi.disabled.clear();
  nativeUi.descriptions.clear();
  nativeUi.notices.length = 0;
  picker.text = null;
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
      getAbstractFileByPath: (p: string) => (disk.files.has(p) ? { path: p } : null),
    },
    workspace: {
      onLayoutReady: vi.fn(),
      getActiveFile: () => null,
      getLeavesOfType: () => [],
      getRightLeaf: () => null,
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
      [...disk.files.keys()].filter((path) => path.startsWith("Solanum/days/"));

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
      expect(notesIn(disk)).toEqual(["Solanum/days/2026-10-31.md"]);
      expect(disk.files.get("Solanum/days/2026-10-31.md")).toContain("| Growing |");
      await plugin.timer.resume(id);
      await vi.advanceTimersByTimeAsync(5 * 60_000 + 3_000);
      expect(disk.files.get("Solanum/days/2026-10-31.md")).toContain("| Harvested |");
      plugin.onunload();
    });

    it("does not rewrite notes for existing history when the plugin starts", async () => {
      const first = await loaded();
      await workAMinute(first.plugin);
      expect(notesIn(first.disk)).toEqual(["Solanum/days/2026-10-31.md"]);
      first.plugin.onunload();
      first.disk.files.delete("Solanum/days/2026-10-31.md");
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
      expect(notesIn(disk)).toEqual(["Solanum/days/2026-10-31.md"]);
      expect(openLinkText).toHaveBeenCalledWith("Solanum/days/2026-10-31.md", "", false);
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
      const { plugin, disk } = await loaded({ dayNotesFolder: "Journal/Focus" });
      await workAMinute(plugin);
      expect([...disk.files.keys()]).toContain("Journal/Focus/2026-10-31.md");
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
      expect(openLinkText).toHaveBeenCalledWith("Solanum/days/2026-11-02.md", "", false);
      await nativeUi.buttons.get("Write notes for all history")!();
      expect(notesIn(disk).sort()).toEqual([
        "Solanum/days/2026-10-31.md",
        "Solanum/days/2026-11-02.md",
      ]);
      expect(nativeUi.notices.join(" ")).toMatch(/Day notes: 1 new, 0 updated, 1 unchanged/);
      plugin.onunload();
    });

    it("saves the day notes settings, rejecting folders that cannot work", async () => {
      const { plugin } = await loaded();
      await nativeSettings.get("Day notes")!(false);
      expect(plugin.settings.dayNotes).toBe(false);
      await nativeSettings.get("Day notes folder")!(".hidden/days");
      expect(nativeUi.descriptions.get("Day notes folder")).toMatch(/hidden/i);
      expect(plugin.settings.dayNotesFolder).toBe("Solanum/days");
      await nativeSettings.get("Day notes folder")!("Journal/Focus");
      expect(plugin.settings.dayNotesFolder).toBe("Journal/Focus");
      plugin.onunload();
    });
  });
});

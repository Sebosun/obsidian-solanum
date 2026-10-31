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
  nativeUi.confirm.answer = true;
  nativeUi.confirm.messages.length = 0;
  vi.clearAllTimers();
  vi.useRealTimers();
});

function vaultFixture() {
  const handlers: Record<string, (...args: unknown[]) => unknown> = {};
  const disk = new MemoryDisk();
  const adapter = Object.assign(disk, { getResourcePath: (p: string) => `app://vault/${p}` });
  const app = {
    vault: {
      adapter,
      on: (name: string, cb: (...args: unknown[]) => unknown) => {
        handlers[name] = cb;
        return {};
      },
      getMarkdownFiles: vi.fn(() => [{ path: "Old.md" }]),
      getAbstractFileByPath: () => null,
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
});

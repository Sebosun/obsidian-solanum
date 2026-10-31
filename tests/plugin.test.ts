// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { App, PluginManifest } from "obsidian";

const nativeSettings = vi.hoisted(() => {
  return new Map<string, (value: string | boolean | number) => Promise<void>>();
});

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
  Notice: vi.fn(),
  PluginSettingTab: class {
    containerEl = document.createElement("div");
  },
  Setting: class {
    name = "";
    setName(name: string) {
      this.name = name;
      return this;
    }
    setDesc() {
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
        addOptions: () => control,
        setValue: () => control,
        setLimits: () => control,
        setDynamicTooltip: () => control,
        setButtonText: () => control,
        onClick: () => control,
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
vi.mock("../src/views/SolanumView", () => ({
  SolanumView: class {},
  VIEW_TYPE_SOLANUM: "solanum-timer",
  VIEW_TYPE_HARVEST: "solanum-harvest",
}));
import SolanumPlugin from "../src/main";
import { getAppStore } from "../src/state/appStore";

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

function vaultFixture() {
  const files = new Map<string, string>();
  const folders = new Set<string>();
  const handlers: Record<string, (...args: unknown[]) => unknown> = {};
  const adapter = {
    exists: async (p: string) => files.has(p) || folders.has(p),
    mkdir: async (p: string) => {
      folders.add(p);
    },
    list: async (p: string) => ({
      files: [...files.keys()].filter((f) => f.startsWith(`${p}/`)),
      folders: [],
    }),
    read: async (p: string) => files.get(p)!,
    write: async (p: string, text: string) => {
      files.set(p, text);
    },
    getResourcePath: (p: string) => `app://vault/${p}`,
  };
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
  return { app, handlers };
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
});

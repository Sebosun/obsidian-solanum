// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { App, PluginManifest } from "obsidian";

vi.mock("obsidian", () => ({
  Plugin: class {
    app: unknown;
    manifest = { dir: ".obsidian/plugins/solanum" };
    constructor(app: unknown) { this.app = app; }
    registerView = vi.fn(); addRibbonIcon = vi.fn(); addCommand = vi.fn(); registerEvent = vi.fn(); registerInterval = vi.fn();
    loadData = async () => null; saveData = vi.fn(async () => {});
  },
  Notice: vi.fn(),
}));
vi.mock("../src/view", () => ({ SolanumView: class {}, VIEW_TYPE_SOLANUM: "solanum-timer", VIEW_TYPE_HARVEST: "solanum-harvest" }));
import SolanumPlugin from "../src/main";

afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

function vaultFixture() {
  const files = new Map<string, string>();
  const folders = new Set<string>();
  const handlers: Record<string, (...args: any[]) => unknown> = {};
  const adapter = {
    exists: async (p: string) => files.has(p) || folders.has(p),
    mkdir: async (p: string) => { folders.add(p); },
    list: async (p: string) => ({ files: [...files.keys()].filter((f) => f.startsWith(`${p}/`)), folders: [] }),
    read: async (p: string) => files.get(p)!,
    write: async (p: string, text: string) => { files.set(p, text); },
    getResourcePath: (p: string) => `app://vault/${p}`,
  };
  const app = {
    vault: { adapter, on: (name: string, cb: (...args: any[]) => unknown) => { handlers[name] = cb; return {}; }, getMarkdownFiles: () => [{ path: "Old.md" }], getAbstractFileByPath: () => null },
    workspace: { onLayoutReady: vi.fn(), getActiveFile: () => null, getLeavesOfType: () => [], getRightLeaf: () => null },
    metadataCache: { getFileCache: () => ({ tags: [{ tag: "#work" }] }) },
  } as unknown as App;
  return { app, handlers };
}

describe("Obsidian lifecycle integration", () => {
  it("keeps crops across plugin unload and restores a deadline on the next load", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
    const { app } = vaultFixture();
    const first = new SolanumPlugin(app, {} as PluginManifest);
    await first.onload();
    await first.timer.start({ durationMs: 5 * 60_000, breakMs: 5 * 60_000, autoBreak: false, tags: ["work"], notePath: null });
    first.onunload();
    vi.setSystemTime(new Date("2026-10-31T12:03:00Z"));
    const second = new SolanumPlugin(app, {} as PluginManifest);
    await second.onload();
    const restored = second.timer.getState().sessions[0];
    expect(second.timer.remaining(restored)).toBe(2 * 60_000);
    await vi.advanceTimersByTimeAsync(2 * 60_000);
    expect(second.timer.getState().sessions[0]).toMatchObject({ phase: "break", status: "waiting" });
    second.onunload();
  });

  it("updates note references on vault rename and exposes indexed Obsidian tags", async () => {
    vi.useFakeTimers();
    const { app, handlers } = vaultFixture();
    const plugin = new SolanumPlugin(app, {} as PluginManifest);
    await plugin.onload();
    await plugin.timer.start({ durationMs: 5 * 60_000, breakMs: 5 * 60_000, autoBreak: false, tags: [], notePath: "Old.md" });
    handlers.rename({ path: "New.md" }, "Old.md");
    await plugin.timer.refresh();
    expect(plugin.timer.getState().sessions[0].notePath).toBe("New.md");
    expect(plugin.tags()).toEqual(["work"]);
    expect(plugin.assetUrl("Tomato_1.glb")).toContain(".obsidian/plugins/solanum/assets/crops/Tomato_1.glb");
    plugin.onunload();
  });
});

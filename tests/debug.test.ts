import { describe, expect, it } from "vitest";
import { readDebugConfig } from "../src/lib/debug/config";
import { seedMonth } from "../src/lib/debug/seeder";
import { DebugTools } from "../src/lib/debug/DebugTools";
import { TimerService } from "../src/lib/timer/TimerService";
import type { Revision } from "../src/lib/timer/types";
import { VaultSessionStore, type FileAdapter } from "../src/lib/storage/VaultSessionStore";
import { isRevision } from "../src/lib/storage/validation";

function fixture(debug = true) {
  const files = new Map<string, Revision>();
  const store = {
    readAll: async () => [...files.values()].map((r) => structuredClone(r)),
    append: async (r: Revision) => {
      files.set(r.id, structuredClone(r));
    },
  };
  let now = new Date(2026, 9, 20, 18).getTime();
  let n = 0;
  const timer = new TimerService(store, { now: () => now, id: () => `debug-${++n}`, debug });
  const tools = new DebugTools(timer, store, { enabled: debug, autoFinishSeconds: 3 }, () => now);
  return {
    timer,
    tools,
    store,
    files,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

const options = {
  durationMs: 25 * 60_000,
  breakMs: 5 * 60_000,
  autoBreak: false,
  tags: ["test"],
  notePath: null,
  crop: "corn" as const,
};

describe("debug controls and seeded history", () => {
  it("requires explicit opt-in and disables debug in a normal production build", () => {
    expect(readDebugConfig({}, false)).toEqual({ enabled: false, autoFinishSeconds: 0 });
    expect(
      readDebugConfig({ SOLANUM_DEBUG: "true", SOLANUM_AUTO_FINISH_SECONDS: "3" }, false),
    ).toEqual({ enabled: true, autoFinishSeconds: 3 });
    expect(
      readDebugConfig({ SOLANUM_DEBUG: "true", SOLANUM_AUTO_FINISH_SECONDS: "3" }, true).enabled,
    ).toBe(false);
    expect(
      readDebugConfig({ SOLANUM_DEBUG: "true", SOLANUM_AUTO_FINISH_SECONDS: "NaN" }, false)
        .autoFinishSeconds,
    ).toBe(0);
  });

  it("auto-finishes only opted-in simulated sessions and preserves their selected crop", async () => {
    const f = fixture();
    await f.timer.start(options);
    f.advance(3000);
    await f.tools.tick();
    expect(f.timer.getState().sessions[0]).toMatchObject({
      crop: "corn",
      source: "debug",
      phase: "break",
      status: "waiting",
    });
    await f.timer.startBreak(f.timer.getState().sessions[0].sessionId);
    f.advance(3000);
    await f.tools.tick();
    expect(f.timer.getState().sessions[0].status).toBe("completed");
    expect([...f.files.values()].every(isRevision)).toBe(true);
  });

  it("refuses debug finishing and seeding when disabled", async () => {
    const f = fixture(false);
    const id = await f.timer.start(options);
    await expect(f.timer.debugFinish(id)).rejects.toThrow(/debug/i);
    await expect(f.tools.seed(new Date(2026, 9, 1))).rejects.toThrow(/debug/i);
    expect(f.timer.getState().sessions[0].phase).toBe("focus");
  });

  it("creates deterministic diverse valid history without future crops or active timers", async () => {
    const now = new Date(2026, 9, 20, 18).getTime();
    const first = seedMonth(new Date(2026, 9, 1), now, ["Project.md"]);
    expect(first.length).toBeGreaterThan(10);
    expect(first).toEqual(seedMonth(new Date(2026, 9, 1), now, ["Project.md"]));
    expect(
      first.every(
        (r) => isRevision(r) && r.source === "seed" && r.phase === "done" && r.focusEndedAt! <= now,
      ),
    ).toBe(true);
    expect(new Set(first.map((r) => r.crop)).size).toBe(4);
    expect(seedMonth(new Date(2027, 1, 1), now)).toEqual([]);
    const f = fixture();
    await f.tools.seed(new Date(2026, 9, 1));
    const count = f.files.size;
    await f.tools.seed(new Date(2026, 9, 1));
    expect(f.files.size).toBe(count);
  });

  it("keeps seeded/debug files out of normal vault history", async () => {
    const files = new Map<string, string>();
    const folders = new Set<string>();
    const disk: FileAdapter = {
      exists: async (p) => files.has(p) || folders.has(p),
      mkdir: async (p) => {
        folders.add(p);
      },
      list: async (p) => ({
        files: [...files.keys()].filter((f) => f.startsWith(`${p}/`)),
        folders: [],
      }),
      read: async (p) => files.get(p)!,
      write: async (p, text) => {
        files.set(p, text);
      },
    };
    const seeded = seedMonth(new Date(2026, 9, 1), new Date(2026, 9, 20, 18).getTime())[0];
    await new VaultSessionStore(disk, { debug: true }).append(seeded);
    expect([...files.keys()][0]).toContain("Solanum/debug-sessions/");
    expect(await new VaultSessionStore(disk).readAll()).toEqual([]);
    await expect(new VaultSessionStore(disk).append(seeded)).rejects.toThrow(/debug/i);
  });
});

import { describe, expect, it } from "vitest";
import { VaultSessionStore, type FileAdapter } from "../src/lib/storage/VaultSessionStore";
import { monthDays, dailyHarvest } from "../src/lib/harvest/aggregate";
import { TimerService } from "../src/lib/timer/TimerService";
import type { Revision } from "../src/lib/timer/types";

class Disk implements FileAdapter {
  files = new Map<string, string>();
  folders = new Set<string>();
  async exists(path: string) {
    return this.files.has(path) || this.folders.has(path);
  }
  async mkdir(path: string) {
    this.folders.add(path);
  }
  async list(path: string) {
    return { files: [...this.files.keys()].filter((f) => f.startsWith(`${path}/`)), folders: [] };
  }
  async read(path: string) {
    if (!this.files.has(path)) throw new Error("missing");
    return this.files.get(path)!;
  }
  async write(path: string, text: string) {
    this.files.set(path, text);
  }
}

async function fixture() {
  const disk = new Disk();
  const store = new VaultSessionStore(disk);
  let now = new Date(2026, 9, 31, 23, 50).getTime();
  let id = 0;
  const service = new TimerService(store, { now: () => now, id: () => `test-${++id}` });
  const sessionId = await service.start({
    durationMs: 25 * 60_000,
    breakMs: 20 * 60_000,
    autoBreak: true,
    tags: ["work"],
    notePath: "Old.md",
  });
  return {
    disk,
    store,
    service,
    sessionId,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe("vault-backed integration", () => {
  it("deduplicates simultaneous expiry recovery through real vault files", async () => {
    const f = await fixture();
    const env = { now: () => new Date(2026, 10, 1, 3).getTime(), id: () => "unused-id" };
    const a = new TimerService(new VaultSessionStore(f.disk), env);
    const b = new TimerService(new VaultSessionStore(f.disk), env);
    await Promise.all([a.refresh(), b.refresh()]);
    expect(f.disk.files.size).toBe(3); // plant, focus expiry, break expiry
    expect(a.getState().sessions[0]).toEqual(b.getState().sessions[0]);
  });

  it("rejects logically inconsistent focus intervals and terminal running states", async () => {
    const f = await fixture();
    const path = [...f.disk.files.keys()][0];
    const valid = f.service.getState().sessions[0];
    f.disk.files.set(path, JSON.stringify({ ...valid, phase: "done", status: "running" }));
    await expect(f.store.readAll()).rejects.toThrow(/session/i);
    f.disk.files.set(
      path,
      JSON.stringify({
        ...valid,
        intervals: [
          { start: valid.startedAt, end: valid.startedAt + 60_000 },
          { start: valid.startedAt + 30_000, end: null },
        ],
      }),
    );
    await expect(f.store.readAll()).rejects.toThrow(/session/i);
  });

  it("updates every session linked under a renamed folder", async () => {
    const f = await fixture();
    await f.service.renameNote("Old.md", "Projects/Old.md");
    await f.service.renameNote("Projects", "Archive");
    expect(f.service.getState().sessions[0].notePath).toBe("Archive/Old.md");
  });

  it("reopens the same files, renames linked notes and preserves immutable history", async () => {
    const f = await fixture();
    await f.service.renameNote("Old.md", "Projects/New.md");
    const recovered = new TimerService(new VaultSessionStore(f.disk), {
      now: Date.now,
      id: () => "other",
    });
    await recovered.refresh();
    expect(recovered.getState().sessions[0].notePath).toBe("Projects/New.md");
    expect(f.disk.files.size).toBeGreaterThan(1);
    expect([...f.disk.files.keys()].every((p) => p.startsWith("Solanum/sessions/"))).toBe(true);
  });

  it("rejects malformed or unknown schemas rather than losing an active crop", async () => {
    const f = await fixture();
    const path = [...f.disk.files.keys()][0];
    f.disk.files.set(path, '{"schema":2}');
    await expect(new VaultSessionStore(f.disk).readAll()).rejects.toThrow(/session|schema/i);
    f.disk.files.set(path, '{"schema":1,"intervals":null}');
    await expect(new VaultSessionStore(f.disk).readAll()).rejects.toThrow(/session/i);
  });

  it("never overwrites an existing revision with different contents", async () => {
    const f = await fixture();
    const revision = f.service.getState().sessions[0];
    await f.store.append(revision);
    await expect(f.store.append({ ...revision, notePath: "Wrong.md" })).rejects.toThrow(
      /collision/i,
    );
  });
});

describe("harvest aggregation", () => {
  it("uses calendar-day boundaries on daylight-saving transitions", async () => {
    const f = await fixture();
    const day = new Date(2026, 2, 8);
    const start = day.getTime();
    const end = new Date(2026, 2, 9).getTime();
    const revision = { ...f.service.getState().sessions[0], intervals: [{ start, end }] };
    expect(dailyHarvest([revision], day).minutes).toBe((end - start) / 60_000);
    expect(dailyHarvest([revision], new Date(2026, 2, 9)).minutes).toBe(0);
  });

  it("splits a focus session across month boundaries and never counts its break", async () => {
    const f = await fixture();
    f.advance(60 * 60_000);
    await f.service.tick();
    const sessions = f.service.getState().sessions;
    expect(dailyHarvest(sessions, new Date(2026, 9, 31)).minutes).toBe(10);
    expect(dailyHarvest(sessions, new Date(2026, 10, 1)).minutes).toBe(15);
    expect(dailyHarvest(sessions, new Date(2026, 10, 2)).minutes).toBe(0);
  });

  it("prefills leap-year and ordinary months, including empty days", () => {
    expect(monthDays(2028, 1)).toHaveLength(29);
    expect(monthDays(2026, 1)).toHaveLength(28);
    expect(monthDays(2026, 9)[30].getDate()).toBe(31);
  });

  it("filters by both tag and note, counts partial work, and caps visible crop density", async () => {
    const f = await fixture();
    f.advance(5 * 60_000);
    await f.service.cancel(f.sessionId);
    const sessions = f.service.getState().sessions;
    const day = new Date(2026, 9, 31);
    expect(dailyHarvest(sessions, day, { tag: "work", notePath: "Old.md" }).minutes).toBe(5);
    expect(dailyHarvest(sessions, day, { tag: "other" }).minutes).toBe(0);
    expect(dailyHarvest(sessions, day, { notePath: "Missing.md" }).minutes).toBe(0);
    const many = Array.from(
      { length: 100 },
      (_, i) => ({ ...sessions[0], sessionId: `s-${i}` }) as Revision,
    );
    expect(dailyHarvest(many, day).crops).toBeLessThanOrEqual(9);
    expect(dailyHarvest(many, day).minutes).toBe(500);
  });
});

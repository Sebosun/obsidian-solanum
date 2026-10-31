import { describe, expect, it } from "vitest";
import { VaultSessionStore } from "@/lib/storage/VaultSessionStore";
import { SessionExchange } from "@/lib/storage/SessionExchange";
import { TimerService } from "@/lib/timer/TimerService";
import { MemoryDisk } from "./helpers/memoryDisk";
import { focusSession } from "./helpers/sessions";

const FOLDER = "Solanum/sessions";
const many = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    focusSession(`s${i}`, new Date(2021, 0, 1 + (i % 300), 9, i % 50), 25),
  );

/** A disk that counts how it is used, and how many operations overlap. */
class CountingDisk extends MemoryDisk {
  reads = 0;
  writes = 0;
  exists_ = 0;
  mkdirs = 0;
  inFlight = 0;
  maxInFlight = 0;
  private async tracked<T>(work: () => Promise<T>): Promise<T> {
    this.inFlight += 1;
    this.maxInFlight = Math.max(this.maxInFlight, this.inFlight);
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      return await work();
    } finally {
      this.inFlight -= 1;
    }
  }
  override read(path: string) {
    this.reads += 1;
    return super.read(path);
  }
  override write(path: string, contents: string) {
    this.writes += 1;
    return this.tracked(() => super.write(path, contents));
  }
  override exists(path: string) {
    this.exists_ += 1;
    return super.exists(path);
  }
  override mkdir(path: string) {
    this.mkdirs += 1;
    return super.mkdir(path);
  }
}

describe("a history with thousands of sessions", () => {
  it("reads each session file only once, however often the history is refreshed", async () => {
    const disk = new CountingDisk();
    const store = new VaultSessionStore(disk, { folder: FOLDER });
    await store.appendNew(many(200));
    disk.reads = 0;
    expect(await store.readAll()).toHaveLength(200);
    expect(disk.reads).toBe(200);
    expect(await store.readAll()).toHaveLength(200);
    expect(await store.readAll()).toHaveLength(200);
    expect(disk.reads).toBe(200);
  });

  it("reads only the files that are new, and forgets files that went away", async () => {
    const disk = new CountingDisk();
    const store = new VaultSessionStore(disk, { folder: FOLDER });
    await store.appendNew(many(10));
    await store.readAll();
    disk.reads = 0;
    await store.append(focusSession("extra", new Date(2022, 0, 1, 9), 25));
    disk.reads = 0;
    expect(await store.readAll()).toHaveLength(11);
    expect(disk.reads).toBe(1);
    const [gone] = [...disk.files.keys()];
    disk.files.delete(gone);
    expect(await store.readAll()).toHaveLength(10);
  });

  it("still refuses a corrupt file instead of caching around it", async () => {
    const disk = new CountingDisk();
    const store = new VaultSessionStore(disk, { folder: FOLDER });
    await store.appendNew(many(3));
    await store.readAll();
    disk.files.set(`${FOLDER}/broken--x.json`, "{not json");
    await expect(store.readAll()).rejects.toThrow(/Cannot read session file/);
    disk.files.delete(`${FOLDER}/broken--x.json`);
    expect(await store.readAll()).toHaveLength(3);
  });

  it("writes new sessions without checking and re-reading each file, and makes the folder once", async () => {
    const disk = new CountingDisk();
    const store = new VaultSessionStore(disk, { folder: FOLDER });
    await store.appendNew(many(300));
    expect(disk.writes).toBe(300);
    expect(disk.reads).toBe(0);
    expect(disk.mkdirs).toBeLessThanOrEqual(2);
    expect(disk.exists_).toBeLessThan(20);
    expect(disk.files.size).toBe(300);
  });

  it("writes the same files as adding sessions one at a time", async () => {
    const left = new CountingDisk();
    const right = new CountingDisk();
    const sessions = many(15);
    await new VaultSessionStore(left, { folder: FOLDER }).appendNew(sessions);
    const slow = new VaultSessionStore(right, { folder: FOLDER });
    for (const session of sessions) await slow.append(session);
    expect([...left.files.entries()].sort()).toEqual([...right.files.entries()].sort());
  });

  it("writes in parallel, but never floods the disk", async () => {
    const disk = new CountingDisk();
    await new VaultSessionStore(disk, { folder: FOLDER }).appendNew(many(200));
    expect(disk.maxInFlight).toBeGreaterThan(1);
    expect(disk.maxInFlight).toBeLessThanOrEqual(16);
  });

  it("refuses an invalid session before writing anything", async () => {
    const disk = new CountingDisk();
    const store = new VaultSessionStore(disk, { folder: FOLDER });
    const bad = { ...focusSession("bad", new Date(2021, 0, 1), 25), durationMs: -1 };
    await expect(store.appendNew([...many(3), bad])).rejects.toThrow(/Invalid session/);
    expect(disk.files.size).toBe(0);
  });

  it("imports a large history quickly in terms of disk use, and reports progress", async () => {
    const disk = new CountingDisk();
    const store = new VaultSessionStore(disk, { folder: FOLDER });
    let now = new Date(2026, 9, 31, 12).getTime();
    const timer = new TimerService(store, { now: () => now, id: () => "unused" });
    const exchange = new SessionExchange(disk, store, timer, () => now);
    now += 0;
    const progress: [number, number][] = [];
    const result = await exchange.importRevisions(many(400), 0, (done, total) =>
      progress.push([done, total]),
    );
    expect(result.added).toBe(400);
    expect(disk.writes).toBe(400);
    expect(disk.exists_ + disk.mkdirs).toBeLessThan(60);
    expect(progress.length).toBeGreaterThan(1);
    expect(progress[progress.length - 1]).toEqual([400, 400]);
    expect(progress.every(([done], i) => i === 0 || done >= progress[i - 1][0])).toBe(true);
    // A second import finds everything already here without writing again.
    disk.writes = 0;
    const again = await exchange.importRevisions(many(400));
    expect(again).toMatchObject({ added: 0, duplicates: 400 });
    expect(disk.writes).toBe(0);
  });
});

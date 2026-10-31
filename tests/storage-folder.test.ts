import { describe, expect, it } from "vitest";
import { VaultSessionStore } from "@/lib/storage/VaultSessionStore";
import { seedMonth } from "@/lib/debug/seeder";
import { MemoryDisk } from "./helpers/memoryDisk";

const [revision] = seedMonth(new Date(2026, 9, 1), new Date(2026, 9, 31).getTime()).map((seed) => ({
  ...seed,
  source: undefined,
}));

describe("configurable session folder", () => {
  it("creates the nested folder chain and stores revisions only there", async () => {
    const disk = new MemoryDisk();
    const store = new VaultSessionStore(disk, { folder: "Assets/focus/sessions" });
    await store.append(revision);
    expect([...disk.files.keys()]).toEqual([
      `Assets/focus/sessions/${revision.sessionId}--${revision.id}.json`,
    ]);
    expect(await store.readAll()).toEqual([revision]);
  });

  it("does not read sessions that live in the previous folder", async () => {
    const disk = new MemoryDisk();
    await new VaultSessionStore(disk, { folder: "Old" }).append(revision);
    expect(await new VaultSessionStore(disk, { folder: "New" }).readAll()).toEqual([]);
  });

  it("switches folders at runtime without rebuilding the store", async () => {
    const disk = new MemoryDisk();
    const store = new VaultSessionStore(disk, { folder: "Old" });
    await store.append(revision);
    store.setFolder("New");
    expect(store.folder).toBe("New");
    expect(await store.readAll()).toEqual([]);
    await store.append({ ...revision, id: "second", parents: [revision.id] });
    expect([...disk.files.keys()].some((path) => path.startsWith("New/"))).toBe(true);
  });

  it("keeps simulated debug sessions in their own fixed folder", async () => {
    const disk = new MemoryDisk();
    const store = new VaultSessionStore(disk, { folder: "Assets/sessions", debug: true });
    await store.append({ ...revision, source: "debug" });
    expect([...disk.files.keys()][0]).toMatch(/^Solanum\/debug-sessions\//);
    expect(await store.readAll()).toHaveLength(1);
  });
});

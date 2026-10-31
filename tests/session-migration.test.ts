import { beforeEach, describe, expect, it } from "vitest";
import { moveSessions, planSessionMove } from "@/lib/storage/migration";
import { VaultSessionStore } from "@/lib/storage/VaultSessionStore";
import { seedMonth } from "@/lib/debug/seeder";
import { MemoryDisk } from "./helpers/memoryDisk";

const revisions = seedMonth(new Date(2026, 9, 1), new Date(2026, 9, 31).getTime())
  .slice(0, 3)
  .map((revision) => ({ ...revision, source: undefined }));
const fileName = (revision: (typeof revisions)[number]) =>
  `${revision.sessionId}--${revision.id}.json`;
const text = (revision: (typeof revisions)[number]) => JSON.stringify(revision, null, 2);

let disk: MemoryDisk;
beforeEach(() => {
  disk = new MemoryDisk();
  disk.folders.add("Solanum");
  disk.folders.add("Solanum/sessions");
  for (const revision of revisions)
    disk.files.set(`Solanum/sessions/${fileName(revision)}`, text(revision));
});

describe("moving sessions to a new folder", () => {
  it("moves every revision byte-for-byte and removes the emptied folder", async () => {
    const result = await moveSessions(disk, "Solanum/sessions", "Assets/sessions");
    expect(result).toMatchObject({ moved: 3, alreadyThere: 0, leftBehind: [] });
    expect(await disk.exists("Solanum/sessions")).toBe(false);
    for (const revision of revisions)
      expect(disk.files.get(`Assets/sessions/${fileName(revision)}`)).toBe(text(revision));
    const loaded = await new VaultSessionStore(disk, { folder: "Assets/sessions" }).readAll();
    expect(loaded.map((revision) => revision.id).sort()).toEqual(
      revisions.map((revision) => revision.id).sort(),
    );
  });

  it("previews the move without touching the disk", async () => {
    const before = new Map(disk.files);
    const plan = await planSessionMove(disk, "Solanum/sessions", "Assets/sessions");
    expect(plan).toMatchObject({ toMove: 3, alreadyThere: 0, conflicts: [], leftBehind: [] });
    expect(disk.files).toEqual(before);
    expect(await disk.exists("Assets")).toBe(false);
  });

  it("merges into a folder that already holds some of the same revisions", async () => {
    disk.folders.add("Assets");
    disk.folders.add("Assets/sessions");
    disk.files.set(`Assets/sessions/${fileName(revisions[0])}`, text(revisions[0]));
    const result = await moveSessions(disk, "Solanum/sessions", "Assets/sessions");
    expect(result).toMatchObject({ moved: 2, alreadyThere: 1 });
    expect(
      [...disk.files.keys()].filter((path) => path.startsWith("Assets/sessions/")),
    ).toHaveLength(3);
    expect(await disk.exists("Solanum/sessions")).toBe(false);
  });

  it("aborts before moving anything when a destination file differs", async () => {
    disk.folders.add("Assets");
    disk.folders.add("Assets/sessions");
    const clashing = `Assets/sessions/${fileName(revisions[1])}`;
    disk.files.set(clashing, text({ ...revisions[1], updatedAt: revisions[1].updatedAt + 1 }));
    const sources = [...disk.files.keys()].filter((path) => path.startsWith("Solanum/"));
    await expect(moveSessions(disk, "Solanum/sessions", "Assets/sessions")).rejects.toThrow(
      new RegExp(fileName(revisions[1])),
    );
    for (const source of sources) expect(disk.files.has(source)).toBe(true);
    expect(disk.files.get(clashing)).not.toBe(text(revisions[1]));
    expect([...disk.files.keys()].filter((path) => path.startsWith("Assets/"))).toEqual([clashing]);
  });

  it("never moves or deletes files that are not valid sessions", async () => {
    disk.files.set("Solanum/sessions/notes.md", "my notes");
    disk.files.set("Solanum/sessions/half-synced--x.json", '{"schema":');
    const result = await moveSessions(disk, "Solanum/sessions", "Assets/sessions");
    expect(result.moved).toBe(3);
    expect(result.leftBehind.sort()).toEqual([
      "Solanum/sessions/half-synced--x.json",
      "Solanum/sessions/notes.md",
    ]);
    expect(disk.files.get("Solanum/sessions/notes.md")).toBe("my notes");
    expect(await disk.exists("Solanum/sessions")).toBe(true);
  });

  it("resumes after an interrupted move without losing or duplicating revisions", async () => {
    const ordered = [...disk.files.keys()].sort();
    const failing = `Assets/sessions/${ordered[1].split("/").pop()}`;
    disk.failWrites.add(failing);
    await expect(moveSessions(disk, "Solanum/sessions", "Assets/sessions")).rejects.toThrow(
      /1 of 3 moved/,
    );
    expect(await disk.exists("Solanum/sessions")).toBe(true);
    const remaining = [...disk.files.keys()].filter((path) => path.startsWith("Solanum/"));
    expect(remaining).toHaveLength(2);
    disk.failWrites.clear();
    const result = await moveSessions(disk, "Solanum/sessions", "Assets/sessions");
    expect(result.moved).toBe(2);
    const moved = [...disk.files.keys()].filter((path) => path.startsWith("Assets/sessions/"));
    expect(moved).toHaveLength(3);
    expect(await disk.exists("Solanum/sessions")).toBe(false);
  });

  it("tolerates a source file another device already moved", async () => {
    const racing = Object.create(disk) as MemoryDisk;
    const target = `Solanum/sessions/${fileName(revisions[0])}`;
    racing.read = async (path: string) => {
      if (path === target) {
        disk.files.delete(target);
        throw new Error(`ENOENT ${path}`);
      }
      return disk.read(path);
    };
    const result = await moveSessions(racing, "Solanum/sessions", "Assets/sessions");
    expect(result.moved).toBe(2);
  });

  it("tolerates another device deleting a source after it was copied", async () => {
    const racing = Object.create(disk) as MemoryDisk;
    racing.remove = async (path: string) => {
      disk.files.delete(path);
      throw new Error(`ENOENT ${path}`);
    };
    const result = await moveSessions(racing, "Solanum/sessions", "Assets/sessions");
    expect(result.moved).toBe(3);
    expect(
      [...disk.files.keys()].filter((path) => path.startsWith("Assets/sessions/")),
    ).toHaveLength(3);
  });

  it("does nothing when the source is missing or equals the destination", async () => {
    expect(await moveSessions(disk, "Missing", "Assets/sessions")).toMatchObject({ moved: 0 });
    expect(await moveSessions(disk, "Solanum/sessions", "Solanum/sessions")).toMatchObject({
      moved: 0,
    });
    expect(disk.files.size).toBe(3);
  });
});

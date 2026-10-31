import { describe, expect, it } from "vitest";
import { TimerService } from "@/lib/timer/TimerService";
import { VaultSessionStore } from "@/lib/storage/VaultSessionStore";
import { SessionFolderManager } from "@/lib/storage/SessionFolderManager";
import { MemoryDisk } from "./helpers/memoryDisk";

async function runningFixture() {
  const disk = new MemoryDisk();
  const store = new VaultSessionStore(disk, { folder: "Solanum/sessions" });
  let now = new Date(2026, 9, 31, 12).getTime();
  let sequence = 0;
  const timer = new TimerService(store, { now: () => now, id: () => `id-${++sequence}` });
  const sessionId = await timer.start({
    durationMs: 25 * 60_000,
    breakMs: 5 * 60_000,
    autoBreak: false,
    tags: ["work"],
    notePath: null,
  });
  const manager = new SessionFolderManager(disk, store, timer);
  return { disk, store, timer, manager, sessionId, advance: (ms: number) => (now += ms) };
}
const filesIn = (disk: MemoryDisk, folder: string) =>
  [...disk.files.keys()].filter((path) => path.startsWith(`${folder}/`));

describe("relocating sessions while a crop is growing", () => {
  it("keeps the running crop and sends later saves to the new folder", async () => {
    const f = await runningFixture();
    const move = f.manager.relocate("Assets/sessions");
    // Issued while the move is still in flight: it must wait, then write to the new folder.
    const pause = f.timer.pause(f.sessionId);
    await Promise.all([move, pause]);
    expect(f.store.folder).toBe("Assets/sessions");
    expect(filesIn(f.disk, "Solanum/sessions")).toEqual([]);
    expect(filesIn(f.disk, "Assets/sessions")).toHaveLength(2);
    expect(f.timer.getState().sessions[0]).toMatchObject({ status: "paused" });
    const reloaded = await new VaultSessionStore(f.disk, { folder: "Assets/sessions" }).readAll();
    expect(reloaded).toHaveLength(2);
  });

  it("still ends a crop that expired during the move, exactly once", async () => {
    const f = await runningFixture();
    f.advance(26 * 60_000);
    await f.manager.relocate("Assets/sessions");
    await f.timer.tick();
    expect(f.timer.getState().sessions[0]).toMatchObject({ phase: "break" });
    expect(filesIn(f.disk, "Assets/sessions").filter((p) => p.includes("-elapsed"))).toHaveLength(
      1,
    );
  });

  it("keeps the old folder active when the move cannot complete", async () => {
    const f = await runningFixture();
    f.disk.folders.add("Assets");
    f.disk.folders.add("Assets/sessions");
    const [source] = filesIn(f.disk, "Solanum/sessions");
    const name = source.split("/").pop();
    f.disk.files.set(`Assets/sessions/${name}`, "different content");
    await expect(f.manager.relocate("Assets/sessions")).rejects.toThrow(/different content/);
    expect(f.store.folder).toBe("Solanum/sessions");
    await f.timer.pause(f.sessionId);
    expect(filesIn(f.disk, "Solanum/sessions")).toHaveLength(2);
  });

  it("reports what a move would do without switching folders", async () => {
    const f = await runningFixture();
    expect(await f.manager.plan("Assets/sessions")).toMatchObject({ toMove: 1, conflicts: [] });
    expect(f.store.folder).toBe("Solanum/sessions");
  });
});

import { describe, expect, it } from "vitest";
import { DayNoteService, type DayNoteLocation } from "@/lib/notes/DayNoteService";
import { MemoryDisk } from "./helpers/memoryDisk";
import { focusSession } from "./helpers/sessions";

const DAY = new Date(2026, 9, 31);
const NOW = new Date(2026, 9, 31, 12).getTime();
const SESSION = focusSession("a", new Date(2026, 9, 31, 9), 25);
const ORIGINAL = "---\nsolanum: day\ndate: 2026-10-31\n---\n## Notes\nKeep my reflection.\n";

async function fixture(root = "Solanum/days") {
  const disk = new MemoryDisk();
  await disk.mkdir(root);
  disk.files.set(`${root}/2026-10-31.md`, ORIGINAL);
  let location: DayNoteLocation = {
    dayNotesFolder: root,
    dayNotesLayout: "flat",
    dayNotesMigrationRoot: null,
  };
  const renamed: string[] = [];
  const service = new DayNoteService({
    adapter: disk,
    getLocation: () => location,
    saveLocation: async (next) => {
      location = next;
    },
    rename: async (from, to) => {
      await disk.write(to, await disk.read(from));
      await disk.remove(from);
      renamed.push(from);
    },
  });
  return { disk, service, renamed, location: () => location };
}

describe("one calendar-document system for every caller", () => {
  it.each(["live", "import", "backfill"])(
    "%s uses the same migration, paths, and content preservation",
    async (caller) => {
      const { disk, service, location } = await fixture();
      if (caller === "live") await service.write([SESSION], DAY, NOW);
      else if (caller === "import") await service.writeDays([SESSION], [DAY], NOW);
      else await service.writeAll([SESSION], NOW);
      expect(location()).toEqual({
        dayNotesFolder: "Solanum",
        dayNotesLayout: "calendar",
        dayNotesMigrationRoot: null,
      });
      expect([...disk.files.keys()]).toEqual(["Solanum/2026/10/2026-10-31.md"]);
      expect(disk.files.get(service.pathFor(DAY))).toContain("Keep my reflection.");
      expect(disk.files.get(service.pathFor(DAY))).toContain("**25 min focused**");
    },
  );

  it("preserves custom roots rather than replacing them with a hardcoded Solanum path", async () => {
    const { disk, service, location } = await fixture("Journal/Focus");
    await service.writeAll([SESSION], NOW);
    expect(location().dayNotesFolder).toBe("Journal/Focus");
    expect([...disk.files.keys()]).toEqual(["Journal/Focus/2026/10/2026-10-31.md"]);
  });

  it("serializes live, import, and backfill work so they migrate once and cannot fork documents", async () => {
    const { disk, service, renamed } = await fixture();
    await Promise.all([
      service.write([SESSION], DAY, NOW),
      service.writeDays([SESSION], [DAY], NOW),
      service.writeAll([SESSION], NOW),
    ]);
    expect(renamed).toEqual(["Solanum/days/2026-10-31.md"]);
    expect([...disk.files.keys()]).toEqual(["Solanum/2026/10/2026-10-31.md"]);
    expect(disk.files.get(service.pathFor(DAY))).toContain("Keep my reflection.");
  });

  it("retries an interrupted migration through any entry point without recreating flat notes", async () => {
    const { disk, service, location } = await fixture();
    disk.failWrites.add("Solanum/2026/10/2026-10-31.md");
    const failed = await service.writeDays([SESSION], [DAY], NOW);
    expect(failed.failures).toHaveLength(1);
    expect(location().dayNotesMigrationRoot).toBe("Solanum");
    expect(disk.files.get("Solanum/days/2026-10-31.md")).toBe(ORIGINAL);
    disk.failWrites.clear();
    await service.write([SESSION], DAY, NOW);
    expect([...disk.files.keys()]).toEqual(["Solanum/2026/10/2026-10-31.md"]);
    expect(location().dayNotesMigrationRoot).toBe(null);
  });
});

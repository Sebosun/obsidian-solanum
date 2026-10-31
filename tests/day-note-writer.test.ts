import { describe, expect, it } from "vitest";
import { DayNoteWriter } from "@/lib/notes/DayNoteWriter";
import { daysTouched } from "@/lib/notes/days";
import { dayKey } from "@/lib/harvest/model";
import { MemoryDisk } from "./helpers/memoryDisk";
import { focusSession } from "./helpers/sessions";

const NOW = new Date(2026, 10, 3, 12).getTime();

function writer(folder = "Solanum/days") {
  const disk = new MemoryDisk();
  let writes = 0;
  const original = disk.write.bind(disk);
  disk.write = async (path, contents) => {
    writes += 1;
    return original(path, contents);
  };
  return { disk, writes: () => writes, notes: new DayNoteWriter(disk, () => folder) };
}

describe("which days a session touches", () => {
  it("lists every local day with focused time, in order, without duplicates", () => {
    const days = daysTouched(
      [
        focusSession("a", new Date(2026, 9, 30, 23, 0), 120),
        focusSession("b", new Date(2026, 9, 31, 9, 0), 25),
        focusSession("c", new Date(2026, 9, 31, 10, 0), 25),
      ],
      NOW,
    );
    expect(days.map(dayKey)).toEqual(["2026-10-30", "2026-10-31"]);
  });

  it("follows a session that is still running up to now", () => {
    const start = new Date(2026, 10, 2, 22, 0).getTime();
    const running = focusSession("r", new Date(start), 25, {
      phase: "focus",
      status: "running",
      focusEndedAt: null,
      deadline: NOW + 60_000,
      intervals: [{ start, end: null }],
    });
    expect(daysTouched([running], NOW).map(dayKey)).toEqual(["2026-11-02", "2026-11-03"]);
  });
});

describe("writing day notes into the vault", () => {
  const morning = focusSession("a", new Date(2026, 9, 31, 9, 0), 25, { tags: ["study"] });

  it("creates the note in the configured folder, making the folders it needs", async () => {
    const { disk, notes } = writer("Journal/Focus/Days");
    const outcome = await notes.write([morning], new Date(2026, 9, 31), NOW);
    expect(outcome).toBe("created");
    const text = disk.files.get("Journal/Focus/Days/2026-10-31.md")!;
    expect(text.startsWith("---\nsolanum: day\ndate: 2026-10-31\n")).toBe(true);
    expect(text).toContain("# Saturday, 31 October 2026");
    expect(text).toContain("| 09:00 | 🍅 Tomato | 25 min | Harvested | #study |");
  });

  it("leaves text the user added and does not rewrite an unchanged note", async () => {
    const { disk, writes, notes } = writer();
    await notes.write([morning], new Date(2026, 9, 31), NOW);
    const path = "Solanum/days/2026-10-31.md";
    disk.files.set(path, `${disk.files.get(path)}\n## My reflection\nGood focus today.\n`);
    const before = writes();
    expect(await notes.write([morning], new Date(2026, 9, 31), NOW)).toBe("unchanged");
    expect(writes()).toBe(before);
    const evening = focusSession("b", new Date(2026, 9, 31, 20, 0), 50);
    expect(await notes.write([morning, evening], new Date(2026, 9, 31), NOW)).toBe("updated");
    const text = disk.files.get(path)!;
    expect(text).toContain("**75 min focused** · 2 sessions");
    expect(text.endsWith("## My reflection\nGood focus today.\n")).toBe(true);
  });

  it("writes nothing for a day without focused time", async () => {
    const { disk, notes } = writer();
    expect(await notes.write([morning], new Date(2026, 9, 30), NOW)).toBe("empty");
    expect(disk.files.size).toBe(0);
  });

  it("never turns demo or debug sessions into notes", async () => {
    const { disk, notes } = writer();
    const demo = focusSession("demo", new Date(2026, 9, 31, 9, 0), 25, { source: "seed" });
    expect(await notes.write([demo], new Date(2026, 9, 31), NOW)).toBe("empty");
    expect(disk.files.size).toBe(0);
  });

  it("backfills a note per active day, splitting a session across midnight", async () => {
    const { disk, notes } = writer();
    const late = focusSession("late", new Date(2026, 9, 31, 23, 30), 60);
    const result = await notes.writeAll([morning, late], NOW);
    expect(result).toEqual({ created: 2, updated: 0, unchanged: 0 });
    expect([...disk.files.keys()].sort()).toEqual([
      "Solanum/days/2026-10-31.md",
      "Solanum/days/2026-11-01.md",
    ]);
    expect(disk.files.get("Solanum/days/2026-11-01.md")).toContain("**30 min focused**");
    expect(await notes.writeAll([morning, late], NOW)).toEqual({
      created: 0,
      updated: 0,
      unchanged: 2,
    });
  });

  it("surfaces a failed write instead of pretending the note exists", async () => {
    const { disk, notes } = writer();
    disk.failWrites.add("Solanum/days/2026-10-31.md");
    await expect(notes.write([morning], new Date(2026, 9, 31), NOW)).rejects.toThrow(
      /Write failed/,
    );
  });
});

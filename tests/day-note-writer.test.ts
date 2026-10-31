import { describe, expect, it } from "vitest";
import { DayNoteWriter } from "@/lib/notes/DayNoteWriter";
import { daysTouched } from "@/lib/notes/days";
import { dayKey } from "@/lib/harvest/model";
import { MemoryDisk } from "./helpers/memoryDisk";
import { focusSession } from "./helpers/sessions";
import type { Revision } from "@/lib/timer/types";

const NOW = new Date(2026, 10, 3, 12).getTime();

function writer(folder = "Solanum") {
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
  const OCT_31 = new Date(2026, 9, 31);

  type Notes = ReturnType<typeof writer>["notes"];
  const writeDay = (notes: Notes, sessions: Revision[], day: Date) =>
    notes.writeDays(sessions, [day], NOW);

  it("creates the note in the configured folder, making the folders it needs", async () => {
    const { disk, notes } = writer("Journal/Focus/Days");
    const result = await writeDay(notes, [morning], OCT_31);
    expect(result).toEqual({ created: 1, updated: 0, unchanged: 0, failures: [] });
    const text = disk.files.get("Journal/Focus/Days/2026/10/2026-10-31.md")!;
    expect(text.startsWith("---\nsolanum: day\ndate: 2026-10-31\n")).toBe(true);
    expect(text).toContain("# Saturday, 31 October 2026");
    expect(text).toContain("| 09:00 | 🍅 Tomato | 25 min | Harvested | #study |");
  });

  it("leaves text the user added and does not rewrite an unchanged note", async () => {
    const { disk, writes, notes } = writer();
    await writeDay(notes, [morning], OCT_31);
    const path = "Solanum/2026/10/2026-10-31.md";
    disk.files.set(path, `${disk.files.get(path)}\n## My reflection\nGood focus today.\n`);
    const before = writes();
    expect(await writeDay(notes, [morning], OCT_31)).toMatchObject({ unchanged: 1, updated: 0 });
    expect(writes()).toBe(before);
    const evening = focusSession("b", new Date(2026, 9, 31, 20, 0), 50);
    expect(await writeDay(notes, [morning, evening], OCT_31)).toMatchObject({ updated: 1 });
    const text = disk.files.get(path)!;
    expect(text).toContain("**75 min focused** · 2 sessions");
    expect(text.endsWith("## My reflection\nGood focus today.\n")).toBe(true);
  });

  it("writes nothing for a day without focused time", async () => {
    const { disk, notes } = writer();
    const result = await writeDay(notes, [morning], new Date(2026, 9, 30));
    expect(result).toEqual({ created: 0, updated: 0, unchanged: 0, failures: [] });
    expect(disk.files.size).toBe(0);
  });

  it("never turns demo or debug sessions into notes", async () => {
    const { disk, notes } = writer();
    const demo = focusSession("demo", new Date(2026, 9, 31, 9, 0), 25, { source: "seed" });
    const result = await writeDay(notes, [demo], OCT_31);
    expect(result).toEqual({ created: 0, updated: 0, unchanged: 0, failures: [] });
    expect(disk.files.size).toBe(0);
  });

  it("backfills a note per active day, splitting a session across midnight", async () => {
    const { disk, notes } = writer();
    const late = focusSession("late", new Date(2026, 9, 31, 23, 30), 60);
    const history = [morning, late];
    const result = await notes.writeDays(history, daysTouched(history, NOW), NOW);
    expect(result).toEqual({ created: 2, updated: 0, unchanged: 0, failures: [] });
    expect([...disk.files.keys()].sort()).toEqual([
      "Solanum/2026/10/2026-10-31.md",
      "Solanum/2026/11/2026-11-01.md",
    ]);
    expect(disk.files.get("Solanum/2026/11/2026-11-01.md")).toContain("**30 min focused**");
    expect(await notes.writeDays(history, daysTouched(history, NOW), NOW)).toEqual({
      created: 0,
      updated: 0,
      unchanged: 2,
      failures: [],
    });
  });

  it("reports a failed write instead of pretending the note exists, and carries on", async () => {
    const { disk, notes } = writer();
    disk.failWrites.add("Solanum/2026/10/2026-10-31.md");
    const nextDay = focusSession("next", new Date(2026, 10, 1, 9, 0), 25);
    const progress: number[] = [];
    const result = await notes.writeDays(
      [morning, nextDay],
      [OCT_31, new Date(2026, 10, 1)],
      NOW,
      (done) => progress.push(done),
    );
    expect(result.created).toBe(1);
    expect(result.failures).toEqual([
      { path: "Solanum/2026/10/2026-10-31.md", reason: expect.stringMatching(/Write failed/) },
    ]);
    expect(progress).toEqual([1, 2]);
  });

  it("splits a year-boundary session and includes other sessions on the requested days", async () => {
    const { disk, notes } = writer();
    const late = focusSession("late", new Date(2025, 11, 31, 23, 30), 60);
    const morning = focusSession("morning", new Date(2026, 0, 1, 9), 25);
    const result = await notes.writeDays([late, morning], daysTouched([late], NOW), NOW);
    expect(result).toEqual({ created: 2, updated: 0, unchanged: 0, failures: [] });
    expect(disk.files.get("Solanum/2025/12/2025-12-31.md")).toContain("**30 min focused**");
    expect(disk.files.get("Solanum/2026/01/2026-01-01.md")).toContain(
      "**55 min focused** · 2 sessions",
    );
  });
});

import { describe, expect, it } from "vitest";
import { blockHeight, layoutHarvestBlocks, summarizeMonth } from "@/lib/harvest/month";
import { HARVEST_BLOCKS as BLOCKS } from "@/lib/scene/constants";
import { focusSession } from "./helpers/sessions";
import type { Revision } from "@/lib/timer/types";

const OCTOBER = new Date(2026, 9, 1);
const NOW = new Date(2026, 10, 1).getTime();
const at = (day: number, hour = 9, minute = 0) => new Date(2026, 9, day, hour, minute);
const stopped = (id: string, start: Date, minutes: number): Revision =>
  focusSession(id, start, minutes, { status: "cancelled", focusEndedAt: null });

describe("one block per harvest", () => {
  it("makes a block for each finished session, in the order the work happened", () => {
    const layout = layoutHarvestBlocks(
      [
        focusSession("late", at(8, 15), 25),
        focusSession("early", at(2, 9), 50),
        focusSession("mid", at(5, 11), 25, { crop: "carrot" }),
      ],
      OCTOBER,
      {},
      NOW,
    );
    expect(layout.blocks.map((block) => block.sessionId)).toEqual(["early", "mid", "late"]);
    expect(layout.blocks.map((block) => block.crop)).toEqual(["tomato", "carrot", "tomato"]);
    expect(layout.total).toBe(3);
  });

  it("counts a session once even when it spans midnight, using this month's minutes", () => {
    const layout = layoutHarvestBlocks(
      [
        focusSession("late", at(31, 23, 30), 60),
        focusSession("other", new Date(2026, 8, 20, 9), 25),
      ],
      OCTOBER,
      {},
      NOW,
    );
    expect(layout.blocks).toHaveLength(1);
    expect(layout.blocks[0].minutes).toBe(30);
  });

  it("leaves out stopped crops and anything the filters exclude", () => {
    const sessions = [
      focusSession("study", at(5), 25, { tags: ["study"] }),
      focusSession("work", at(6), 25, { tags: ["work"], notePath: "Project.md" }),
      stopped("oops", at(7), 25),
    ];
    const ids = (filter: Parameters<typeof layoutHarvestBlocks>[2]) =>
      layoutHarvestBlocks(sessions, OCTOBER, filter, NOW).blocks.map((block) => block.sessionId);
    expect(ids({})).toEqual(["study", "work"]);
    expect(ids({ tag: "study" })).toEqual(["study"]);
    expect(ids({ notePath: "Project.md" })).toEqual(["work"]);
  });

  it("is an empty layout for a month with nothing finished", () => {
    const layout = layoutHarvestBlocks([stopped("a", at(5), 20)], OCTOBER, {}, NOW);
    // Nothing to put on it, but the plinth is a real one: a few rows deep, not a sliver.
    expect(layout).toMatchObject({ blocks: [], total: 0 });
    expect(layout.rows).toBeGreaterThanOrEqual(3);
  });
});

describe("how tall a block is", () => {
  it("grows with the session and stops growing at ninety minutes", () => {
    expect(blockHeight(25)).toBeCloseTo(0.22 + (25 / 90) * 1.1, 6);
    expect(blockHeight(50)).toBeCloseTo(0.22 + (50 / 90) * 1.1, 6);
    expect(blockHeight(90)).toBeCloseTo(1.32, 6);
    expect(blockHeight(150)).toBe(blockHeight(90));
    expect(blockHeight(0)).toBeCloseTo(BLOCKS.minHeight, 6);
  });

  it("gives longer sessions taller blocks in the layout", () => {
    const [short, long] = layoutHarvestBlocks(
      [focusSession("short", at(2), 25), focusSession("long", at(3), 90)],
      OCTOBER,
      {},
      NOW,
    ).blocks;
    expect(long.height).toBeGreaterThan(short.height);
  });
});

describe("the grid", () => {
  const many = (count: number) =>
    Array.from({ length: count }, (_, i) =>
      focusSession(`s${i}`, at(1 + (i % 28), 6 + (i % 12), i % 60), 25),
    );

  it("fills rows from the back left and stays centred", () => {
    const { blocks, columns } = layoutHarvestBlocks(many(37), OCTOBER, {}, NOW);
    expect(columns).toBe(8);
    const [first, second, ninth] = [blocks[0], blocks[1], blocks[columns]];
    expect(second.position[0]).toBeGreaterThan(first.position[0]);
    expect(second.position[2]).toBe(first.position[2]);
    expect(ninth.position[2]).toBeGreaterThan(first.position[2]);
    expect(ninth.position[0]).toBe(first.position[0]);
    const meanX = blocks.reduce((sum, block) => sum + block.position[0], 0) / blocks.length;
    expect(Math.abs(meanX)).toBeLessThan(BLOCKS.pitch);
    expect(new Set(blocks.map((block) => block.position.join())).size).toBe(blocks.length);
  });

  it("gets wider with a busier month, within limits", () => {
    const columns = (count: number) => layoutHarvestBlocks(many(count), OCTOBER, {}, NOW).columns;
    expect(columns(2)).toBe(BLOCKS.minColumns);
    expect(columns(20)).toBeLessThan(columns(80));
    expect(columns(400)).toBe(BLOCKS.maxColumns);
  });

  it("thins a very busy month evenly instead of drawing hundreds of blocks", () => {
    const layout = layoutHarvestBlocks(many(400), OCTOBER, {}, NOW);
    expect(layout.total).toBe(400);
    expect(layout.blocks).toHaveLength(BLOCKS.maxBlocks);
    const ordered = layout.blocks.map((block) => block.startedAt);
    expect([...ordered].sort((a, b) => a - b)).toEqual(ordered);
  });
});

describe("growing crops", () => {
  it("shows a crop still growing as unfinished, and a harvested one as complete", () => {
    const start = at(5).getTime();
    const growing = focusSession("grow", new Date(start), 40, {
      phase: "focus",
      status: "running",
      focusEndedAt: null,
      deadline: start + 40 * 60_000,
      intervals: [{ start, end: null }],
    });
    const now = start + 10 * 60_000;
    const [crop] = layoutHarvestBlocks([growing], OCTOBER, {}, now).blocks;
    expect(crop.progress).toBeCloseTo(0.25, 2);
    const [done] = layoutHarvestBlocks([focusSession("done", at(5), 25)], OCTOBER, {}, NOW).blocks;
    expect(done.progress).toBe(1);
  });
});

describe("the month in numbers", () => {
  const sessions = [
    focusSession("a", at(5), 25, { tags: ["study", "deep"] }),
    focusSession("b", at(5, 11), 50, { crop: "carrot", tags: ["study"] }),
    focusSession("c", at(9), 25, { crop: "carrot", tags: ["work"] }),
    focusSession("late", at(31, 23, 30), 60, { crop: "corn" }),
    stopped("oops", at(12), 30),
    focusSession("other-month", new Date(2026, 8, 20, 9), 25),
  ];

  it("totals focused time, harvests and active days for the month only", () => {
    expect(summarizeMonth(sessions, OCTOBER, {}, NOW)).toMatchObject({
      minutes: 25 + 50 + 25 + 30,
      harvests: 4,
      activeDays: 3,
    });
  });

  it("counts each crop type once per harvest and ranks tags by use", () => {
    const summary = summarizeMonth(sessions, OCTOBER, {}, NOW);
    expect(summary.crops).toEqual({
      tomato: 1,
      carrot: 2,
      corn: 1,
      pumpkin: 0,
      coconut: 0,
      apple: 0,
    });
    expect(summary.tags).toEqual([
      { tag: "study", count: 2 },
      { tag: "deep", count: 1 },
      { tag: "work", count: 1 },
    ]);
  });

  it("is zero for a month with nothing finished", () => {
    expect(summarizeMonth([], OCTOBER, {}, NOW)).toEqual({
      minutes: 0,
      harvests: 0,
      activeDays: 0,
      crops: { tomato: 0, carrot: 0, corn: 0, pumpkin: 0, coconut: 0, apple: 0 },
      tags: [],
    });
  });
});

describe("an empty month", () => {
  it("still has a plinth to show: a real grid with nothing on it, not a sliver", () => {
    const empty = layoutHarvestBlocks([], OCTOBER, {}, NOW);
    expect(empty.blocks).toEqual([]);
    expect(empty.total).toBe(0);
    expect(empty.columns).toBeGreaterThanOrEqual(6);
    expect(empty.rows).toBeGreaterThanOrEqual(3);
  });

  it("looks the same whether no session exists or none finished that month", () => {
    const none = layoutHarvestBlocks([], OCTOBER, {}, NOW);
    const stoppedOnly = layoutHarvestBlocks([stopped("s", at(3), 25)], OCTOBER, {}, NOW);
    const filteredOut = layoutHarvestBlocks(
      [focusSession("a", at(3), 25, { tags: ["x"] })],
      OCTOBER,
      { tag: "other" },
      NOW,
    );
    expect(stoppedOnly).toEqual(none);
    expect(filteredOut).toEqual(none);
  });

  it("does not change the size of a month that has harvests", () => {
    const one = layoutHarvestBlocks([focusSession("a", at(3), 25)], OCTOBER, {}, NOW);
    expect(one.rows).toBe(1);
  });
});

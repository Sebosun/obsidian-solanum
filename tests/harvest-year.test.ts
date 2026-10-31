import { describe, expect, it } from "vitest";
import { layoutYearStacks, summarizeYear, type YearMonth } from "@/lib/harvest/year";
import { YEAR_STACKS } from "@/lib/scene/constants";
import { focusSession } from "./helpers/sessions";
import type { Revision } from "@/lib/timer/types";

const NOW = new Date(2027, 0, 1).getTime();
const session = (id: string, start: Date, minutes: number, extra: Partial<Revision> = {}) =>
  focusSession(id, start, minutes, extra);

describe("summarising the year", () => {
  it("has twelve months, each summarised the same way as the month view", () => {
    const months = summarizeYear(
      [
        session("a", new Date(2026, 9, 5, 9), 25, { tags: ["study"] }),
        session("b", new Date(2026, 9, 6, 9), 50, { crop: "carrot" }),
      ],
      2026,
      {},
      NOW,
    );
    expect(months.map((month) => month.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(months[9]).toMatchObject({ minutes: 75, harvests: 2, activeDays: 2 });
    expect(months[9].crops).toMatchObject({ tomato: 1, carrot: 1 });
    expect(months[8]).toMatchObject({ minutes: 0, harvests: 0 });
  });

  it("splits a session that crosses a month boundary and ignores other years", () => {
    const months = summarizeYear(
      [
        session("late", new Date(2026, 9, 31, 23, 30), 60),
        session("old", new Date(2025, 5, 1, 9), 30),
      ],
      2026,
      {},
      NOW,
    );
    expect(months[9].minutes).toBe(30);
    expect(months[10].minutes).toBe(30);
    expect(months.reduce((total, month) => total + month.minutes, 0)).toBe(60);
  });

  it("applies the tag and note filters and skips stopped crops", () => {
    const sessions = [
      session("study", new Date(2026, 2, 3, 9), 30, { tags: ["study"] }),
      session("work", new Date(2026, 2, 3, 11), 40, { tags: ["work"], notePath: "Project.md" }),
      session("oops", new Date(2026, 2, 3, 15), 20, { status: "cancelled", focusEndedAt: null }),
    ];
    expect(summarizeYear(sessions, 2026, {}, NOW)[2].minutes).toBe(70);
    expect(summarizeYear(sessions, 2026, { tag: "study" }, NOW)[2].minutes).toBe(30);
    expect(summarizeYear(sessions, 2026, { notePath: "Project.md" }, NOW)[2].minutes).toBe(40);
  });
});

const HOUR = 60;
function months(hours: number[], mix?: Partial<Record<string, number>>): YearMonth[] {
  return hours.map((value, index) => ({
    index,
    date: new Date(2026, index, 1),
    minutes: value * HOUR,
    harvests: value > 0 ? 1 : 0,
    activeDays: value > 0 ? 1 : 0,
    crops: { tomato: 1, carrot: 0, corn: 0, pumpkin: 0, coconut: 0, apple: 0, ...mix },
    tags: [],
  }));
}

describe("a stack of crates for each month", () => {
  it("makes the busiest month exactly as tall as the tallest allowed stack", () => {
    const { stacks } = layoutYearStacks(months([0, 20, 58, 29]));
    expect(stacks[2].crates).toBe(YEAR_STACKS.maxCrates);
    expect(stacks.every((stack) => stack.crates <= YEAR_STACKS.maxCrates)).toBe(true);
  });

  it("stacks higher for a busier month, with a crate standing for the same time everywhere", () => {
    const layout = layoutYearStacks(months([0, 15, 58, 29, 29]));
    const crates = layout.stacks.map((stack) => stack.crates);
    expect(crates[2]).toBeGreaterThan(crates[3]);
    expect(crates[3]).toBeGreaterThan(crates[1]);
    expect(crates[3]).toBe(crates[4]);
    // Whole crates plus the partial top one account for the month's time.
    for (const stack of layout.stacks.filter((item) => item.minutes > 0)) {
      expect(stack.crates).toBe(Math.ceil(stack.minutes / layout.crateMinutes));
    }
  });

  it("rounds what a crate stands for to half an hour, and never below two hours", () => {
    const busy = layoutYearStacks(months([58]));
    expect(busy.crateMinutes % 30).toBe(0);
    expect(busy.crateMinutes).toBeGreaterThanOrEqual((58 * HOUR) / YEAR_STACKS.maxCrates);
    expect(busy.crateMinutes).toBeLessThan((58 * HOUR) / YEAR_STACKS.maxCrates + 30);
    const light = layoutYearStacks(months([1, 3]));
    expect(light.crateMinutes).toBe(YEAR_STACKS.minCrateMinutes);
    expect(light.stacks[0].crates).toBe(1);
    expect(light.stacks[1].crates).toBe(2);
  });

  it("leaves a month with nothing finished as a single bare, low crate", () => {
    const { stacks } = layoutYearStacks(months([0, 12]));
    expect(stacks[0]).toMatchObject({ crates: 0, empty: true, plants: [] });
    expect(stacks[1].empty).toBe(false);
  });

  it("marks the busiest month, and only it", () => {
    const { stacks } = layoutYearStacks(months([10, 50, 30, 50.5]));
    expect(stacks.filter((stack) => stack.busiest).map((stack) => stack.index)).toEqual([3]);
    expect(layoutYearStacks(months([0, 0])).stacks.some((stack) => stack.busiest)).toBe(false);
  });

  it("fills the top crate by how much of a crate the last hours make", () => {
    // 60 hours over six crates is ten hours a crate: one month is exactly a full crate, another a third.
    const layout = layoutYearStacks(months([60, 10, 3.5]));
    expect(layout.crateMinutes).toBe(600);
    const plants = layout.stacks.map((stack) => stack.plants.length);
    expect(plants[1]).toBe(YEAR_STACKS.topPlants);
    expect(plants[2]).toBe(Math.round((YEAR_STACKS.topPlants * 210) / 600));
    expect(plants[2]).toBeGreaterThanOrEqual(YEAR_STACKS.minTopPlants);
  });

  it("grows the crops in the proportion they were harvested, mixed rather than in blocks", () => {
    const layout = layoutYearStacks(months([60, 30], { tomato: 3, carrot: 1 }));
    const full = layout.stacks[0].plants;
    expect(full).toHaveLength(YEAR_STACKS.topPlants);
    expect(full.filter((crop) => crop === "tomato").length).toBe(11);
    expect(full.filter((crop) => crop === "carrot").length).toBe(4);
    expect(full.slice(0, 3)).toContain("carrot");
  });
});

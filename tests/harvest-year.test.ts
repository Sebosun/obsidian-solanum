import { describe, expect, it } from "vitest";
import { buildHarvestYear, intensityLevel } from "@/lib/harvest/year";
import { seedMonth } from "@/lib/debug/seeder";
import type { Revision } from "@/lib/timer/types";

const template = seedMonth(new Date(2026, 9, 1), new Date(2026, 10, 1).getTime())[0];
function focus(id: string, start: Date, minutes: number, extra: Partial<Revision> = {}): Revision {
  const from = start.getTime();
  const to = from + minutes * 60_000;
  return {
    ...template,
    id,
    sessionId: id,
    source: undefined,
    tags: [],
    notePath: null,
    startedAt: from,
    intervals: [{ start: from, end: to }],
    focusEndedAt: to,
    ...extra,
  };
}
const NOW = new Date(2027, 0, 1).getTime();

describe("year overview data", () => {
  it("covers all twelve months with the right number of days, including leap years", () => {
    const lengths = (year: number) =>
      buildHarvestYear([], year, {}, NOW).map((month) => month.days.length);
    expect(lengths(2026)).toEqual([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
    expect(lengths(2028)[1]).toBe(29);
  });

  it("places each month's first day in the right weekday column", () => {
    const months = buildHarvestYear([], 2026, {}, NOW);
    expect(months[0].offset).toBe(4); // 1 Jan 2026 is a Thursday
    expect(months[9].offset).toBe(4); // 1 Oct 2026 is a Thursday
    expect(months[1].offset).toBe(0); // 1 Feb 2026 is a Sunday
  });

  it("sums focused minutes per day and per month", () => {
    const months = buildHarvestYear(
      [focus("a", new Date(2026, 9, 5, 9), 25), focus("b", new Date(2026, 9, 5, 14), 50)],
      2026,
      {},
      NOW,
    );
    const october = months[9];
    expect(october.days[4].minutes).toBe(75);
    expect(october.minutes).toBe(75);
    expect(months[8].minutes).toBe(0);
  });

  it("splits a session that crosses midnight and a month boundary", () => {
    const months = buildHarvestYear(
      [focus("late", new Date(2026, 9, 31, 23, 30), 60)],
      2026,
      {},
      NOW,
    );
    expect(months[9].days[30].minutes).toBe(30);
    expect(months[10].days[0].minutes).toBe(30);
    expect(months[9].minutes + months[10].minutes).toBe(60);
  });

  it("applies the tag and note filters", () => {
    const sessions = [
      focus("study", new Date(2026, 2, 3, 9), 30, { tags: ["study"] }),
      focus("work", new Date(2026, 2, 3, 11), 40, { tags: ["work"], notePath: "Project.md" }),
    ];
    expect(buildHarvestYear(sessions, 2026, {}, NOW)[2].minutes).toBe(70);
    expect(buildHarvestYear(sessions, 2026, { tag: "study" }, NOW)[2].minutes).toBe(30);
    expect(buildHarvestYear(sessions, 2026, { notePath: "Project.md" }, NOW)[2].minutes).toBe(40);
  });

  it("ignores sessions from other years", () => {
    const sessions = [focus("old", new Date(2025, 5, 1, 9), 30)];
    expect(buildHarvestYear(sessions, 2026, {}, NOW).every((month) => month.minutes === 0)).toBe(
      true,
    );
  });
});

describe("heat levels", () => {
  it.each([
    [0, 0],
    [1, 1],
    [29, 1],
    [30, 2],
    [59, 2],
    [60, 3],
    [119, 3],
    [120, 4],
    [600, 4],
  ])("%d minutes is level %d", (minutes, level) => {
    expect(intensityLevel(minutes)).toBe(level);
  });
});

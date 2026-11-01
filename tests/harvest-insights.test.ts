import { describe, expect, it } from "vitest";
import { monthInsights, yearInsights } from "@/lib/harvest/insights";
import { focusSession } from "./helpers/sessions";

const MONTH = new Date(2026, 9, 1);
const NOW = new Date(2026, 10, 1).getTime();

describe("monthly focus insights", () => {
  const sessions = [
    focusSession("boundary", new Date(2026, 8, 30, 23, 30), 90, {
      tags: ["work", "study"],
      notePath: "Projects/A.md",
    }),
    focusSession("split", new Date(2026, 9, 1, 11, 30), 90, { tags: ["work"] }),
    focusSession("paused", new Date(2026, 9, 2, 17), 120, {
      intervals: [
        { start: new Date(2026, 9, 2, 17).getTime(), end: new Date(2026, 9, 2, 17, 30).getTime() },
        { start: new Date(2026, 9, 2, 18, 30).getTime(), end: new Date(2026, 9, 2, 19).getTime() },
      ],
    }),
    focusSession("cancelled", new Date(2026, 9, 3, 9), 100, { status: "cancelled" }),
    focusSession("outside", new Date(2026, 10, 1, 9), 100),
  ];

  it("clips focus at month and period boundaries and excludes pauses and cancellations", () => {
    const result = monthInsights(sessions, MONTH, {}, NOW);
    expect(result.days).toHaveLength(31);
    expect(result.days.map((day) => day.minutes)).toEqual([150, 60, ...Array(29).fill(0)]);
    expect(result.weekdays.map((day) => day.minutes)).toEqual([0, 0, 0, 150, 60, 0, 0]);
    expect(result.periods.map((period) => period.minutes)).toEqual([60, 30, 90, 30]);
    expect(result.previous).toMatchObject({ minutes: 30, harvests: 1, activeDays: 1 });
    expect(result.tags).toEqual([
      { name: "work", minutes: 150 },
      { name: "study", minutes: 60 },
      { name: "Untagged", minutes: 60 },
    ]);
    expect(result.notes).toEqual([
      { name: "No linked note", minutes: 150 },
      { name: "Projects/A.md", minutes: 60 },
    ]);
  });

  it("applies the same filters to charts, distributions and the previous month", () => {
    const result = monthInsights(sessions, MONTH, { tag: "study", notePath: "Projects/A.md" }, NOW);
    expect(result.days[0].minutes).toBe(60);
    expect(result.days.slice(1).every((day) => day.minutes === 0)).toBe(true);
    expect(result.previous.minutes).toBe(30);
    expect(result.notes).toEqual([{ name: "Projects/A.md", minutes: 60 }]);
  });

  it("uses only elapsed focus for a running interval and handles an empty prior year", () => {
    const now = new Date(2026, 0, 1, 6, 10).getTime();
    const running = focusSession("live", new Date(2026, 0, 1, 5, 50), 60, {
      status: "running",
      phase: "focus",
      focusEndedAt: null,
      deadline: new Date(2026, 0, 1, 6, 50).getTime(),
      intervals: [{ start: new Date(2026, 0, 1, 5, 50).getTime(), end: null }],
    });
    const result = monthInsights([running], new Date(2026, 0, 1), {}, now);
    expect(result.days[0].minutes).toBe(20);
    expect(result.periods.map((period) => period.minutes)).toEqual([10, 10, 0, 0]);
    expect(result.previous).toMatchObject({ minutes: 0, harvests: 0, activeDays: 0 });
  });
});

it("builds year patterns from all months, clips year boundaries, and respects filters", () => {
  const sessions = [
    focusSession("boundary", new Date(2025, 11, 31, 23, 30), 90, {
      tags: ["study"],
      notePath: "A.md",
    }),
    focusSession("october", new Date(2026, 9, 1, 11, 30), 90, {
      tags: ["study"],
      notePath: "A.md",
    }),
    focusSession("work", new Date(2026, 5, 1, 18), 30, { tags: ["work"] }),
    focusSession("cancelled", new Date(2026, 5, 2, 9), 100, { status: "cancelled" }),
    focusSession("outside", new Date(2027, 0, 1, 9), 100),
  ];
  const now = new Date(2027, 0, 2).getTime();
  const result = yearInsights(sessions, 2026, {}, now);
  expect(result.weekdays.map((item) => item.minutes)).toEqual([30, 0, 0, 150, 0, 0, 0]);
  expect(result.periods.map((item) => item.minutes)).toEqual([60, 30, 60, 30]);
  expect(result.notes).toEqual([
    { name: "A.md", minutes: 150 },
    { name: "No linked note", minutes: 30 },
  ]);
  const filtered = yearInsights(sessions, 2026, { tag: "study", notePath: "A.md" }, now);
  expect(filtered.tags).toEqual([{ name: "study", minutes: 150 }]);
  expect(filtered.periods.map((item) => item.minutes)).toEqual([60, 30, 60, 0]);
});

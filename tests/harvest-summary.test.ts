import { describe, expect, it } from "vitest";
import { summarizeYearTotal } from "@/lib/harvest/year";
import { focusSession } from "./helpers/sessions";

describe("year summary totals", () => {
  it("counts a cross-month harvest and its tags once, while retaining both days of focus", () => {
    const sessions = [
      focusSession("boundary", new Date(2026, 0, 31, 23, 50), 30, { tags: ["study"] }),
      focusSession("second", new Date(2026, 5, 3, 9), 25, { tags: ["study", "work"] }),
      focusSession("outside", new Date(2025, 5, 3, 9), 60, { tags: ["work"] }),
    ];
    const now = new Date(2027, 0, 1).getTime();
    const summary = summarizeYearTotal(sessions, 2026, {}, now);
    expect(summary.minutes).toBe(55);
    expect(summary.harvests).toBe(2);
    expect(summary.activeDays).toBe(3);
    expect(summary.tags).toEqual([
      { tag: "study", count: 2 },
      { tag: "work", count: 1 },
    ]);
    const filtered = summarizeYearTotal(sessions, 2026, { tag: "work" }, now);
    expect(filtered.minutes).toBe(25);
    expect(filtered.harvests).toBe(1);
    expect(filtered.activeDays).toBe(1);
  });
});

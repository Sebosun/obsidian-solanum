import { describe, expect, it } from "vitest";
import { isEmptyMonth } from "@/lib/harvest/empty";
import { layoutHarvestBlocks, summarizeMonth } from "@/lib/harvest/month";
import { focusSession } from "./helpers/sessions";

const OCTOBER = new Date(2026, 9, 1);
const NOW = new Date(2026, 10, 1).getTime();
const at = (day: number) => new Date(2026, 9, day, 9);

describe("when a month counts as empty", () => {
  it("is empty with no sessions, and the numbers agree", () => {
    const layout = layoutHarvestBlocks([], OCTOBER, {}, NOW);
    expect(isEmptyMonth(layout)).toBe(true);
    expect(summarizeMonth([], OCTOBER, {}, NOW).minutes).toBe(0);
  });

  it("is empty when the only sessions focused for no time, and the minutes agree", () => {
    const instant = focusSession("instant", at(3), 0);
    const layout = layoutHarvestBlocks([instant], OCTOBER, {}, NOW);
    expect(isEmptyMonth(layout)).toBe(true);
    expect(summarizeMonth([instant], OCTOBER, {}, NOW).minutes).toBe(0);
  });

  it("is empty when a filter leaves nothing, and the minutes agree", () => {
    const tagged = focusSession("tagged", at(3), 25, { tags: ["study"] });
    const filter = { tag: "other" };
    expect(isEmptyMonth(layoutHarvestBlocks([tagged], OCTOBER, filter, NOW))).toBe(true);
    expect(summarizeMonth([tagged], OCTOBER, filter, NOW).minutes).toBe(0);
  });

  it("is empty when the only session was stopped before it matured", () => {
    const stopped = focusSession("stopped", at(3), 25, { status: "cancelled" });
    expect(isEmptyMonth(layoutHarvestBlocks([stopped], OCTOBER, {}, NOW))).toBe(true);
    expect(summarizeMonth([stopped], OCTOBER, {}, NOW).minutes).toBe(0);
  });

  it("is not empty with a harvest, and the minutes agree", () => {
    const done = focusSession("done", at(3), 25);
    expect(isEmptyMonth(layoutHarvestBlocks([done], OCTOBER, {}, NOW))).toBe(false);
    expect(summarizeMonth([done], OCTOBER, {}, NOW).minutes).toBeGreaterThan(0);
  });

  it("is a month of its own: a harvest in another month leaves this one empty", () => {
    const september = focusSession("sep", new Date(2026, 8, 20, 9), 25);
    expect(isEmptyMonth(layoutHarvestBlocks([september], OCTOBER, {}, NOW))).toBe(true);
  });
});

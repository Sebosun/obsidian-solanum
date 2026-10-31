import { describe, expect, it } from "vitest";
import { dailyHarvest } from "@/lib/harvest/aggregate";
import { layoutHarvestBlocks, summarizeMonth } from "@/lib/harvest/month";
import { buildHarvestYear } from "@/lib/harvest/year";
import { buildDayNote } from "@/lib/notes/dayNote";
import { focusSession } from "./helpers/sessions";
import type { Revision } from "@/lib/timer/types";

const DAY = new Date(2026, 9, 31);
const NOW = new Date(2026, 9, 31, 18).getTime();
const at = (hour: number, minute = 0) => new Date(2026, 9, 31, hour, minute);

/** Focus ended early by the user: the crop never matured. */
const stopped = (id: string, minutes: number): Revision =>
  focusSession(id, at(9), minutes, { status: "cancelled", focusEndedAt: null });
const harvested = focusSession("done", at(11), 25);
function paused(id: string, minutes: number): Revision {
  const start = at(14).getTime();
  return focusSession(id, new Date(start), minutes, {
    phase: "focus",
    status: "paused",
    focusEndedAt: null,
    deadline: null,
    remainingMs: 10 * 60_000,
    intervals: [{ start, end: start + minutes * 60_000 }],
  });
}

describe("a crop stopped before it finished earns nothing", () => {
  it("adds no minutes and no entry to the day, whatever the filter", () => {
    const sessions = [stopped("a", 20), harvested];
    const { minutes, entries } = dailyHarvest(sessions, DAY, {}, NOW);
    expect(minutes).toBe(25);
    expect(entries.map((entry) => entry.session.id)).toEqual(["done"]);
  });

  it("draws no block for a stopped crop and adds nothing to the month's numbers", () => {
    const month = new Date(2026, 9, 1);
    const sessions = [stopped("a", 20), stopped("b", 3)];
    expect(layoutHarvestBlocks(sessions, month, {}, NOW).blocks).toEqual([]);
    expect(summarizeMonth(sessions, month, {}, NOW)).toMatchObject({ minutes: 0, harvests: 0 });
    const withHarvest = layoutHarvestBlocks([...sessions, harvested], month, {}, NOW);
    expect(withHarvest.blocks.map((block) => block.sessionId)).toEqual(["done"]);
  });

  it("does not count towards the year overview", () => {
    const months = buildHarvestYear([stopped("a", 20), harvested], 2026, {}, NOW);
    expect(months[9].minutes).toBe(25);
    expect(buildHarvestYear([stopped("a", 20)], 2026, {}, NOW)[9].minutes).toBe(0);
  });

  it("produces no day note", () => {
    const { entries } = dailyHarvest([stopped("a", 20)], DAY, {}, NOW);
    expect(buildDayNote(DAY, entries)).toBeNull();
  });

  it("still credits a crop that is paused or still growing, which may yet finish", () => {
    const start = at(15).getTime();
    const growing = focusSession("grow", new Date(start), 25, {
      phase: "focus",
      status: "running",
      focusEndedAt: null,
      deadline: NOW + 60_000,
      intervals: [{ start, end: null }],
    });
    const { minutes, entries } = dailyHarvest([paused("p", 12), growing], DAY, {}, NOW);
    expect(entries).toHaveLength(2);
    expect(minutes).toBeGreaterThan(12);
  });

  it("still credits a break that was skipped, since its crop had already matured", () => {
    const skipped = focusSession("skip", at(10), 25, { phase: "done", status: "completed" });
    expect(dailyHarvest([skipped], DAY, {}, NOW).minutes).toBe(25);
  });
});

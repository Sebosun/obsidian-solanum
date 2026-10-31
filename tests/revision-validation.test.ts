import { describe, expect, it } from "vitest";
import { isRevision } from "@/lib/storage/validation";
import type { Revision } from "@/lib/timer/types";
import { focusSession } from "./helpers/sessions";

const START = new Date(2026, 9, 31, 9).getTime();

const finished = (): Revision => focusSession("a", new Date(START), 25);

const running = (): Revision => ({
  ...finished(),
  phase: "focus",
  status: "running",
  deadline: START + 25 * 60_000,
  remainingMs: 25 * 60_000,
  focusEndedAt: null,
  intervals: [{ start: START, end: null }],
});

const waitingBreak = (): Revision => ({
  ...finished(),
  phase: "break",
  status: "waiting",
  remainingMs: 5 * 60_000,
});

/** A copy with one field replaced by something a damaged or foreign file might hold. */
const damaged = (base: Revision, field: string, value: unknown): unknown => ({
  ...base,
  [field]: value,
});

describe("what counts as a session revision", () => {
  it("accepts finished, running and waiting sessions", () => {
    expect(isRevision(finished())).toBe(true);
    expect(isRevision(running())).toBe(true);
    expect(isRevision(waitingBreak())).toBe(true);
    expect(isRevision({ ...finished(), source: "seed" })).toBe(true);
  });

  it("rejects anything that is not a plain object", () => {
    for (const value of [undefined, null, 0, "revision", true, [], [finished()]])
      expect(isRevision(value)).toBe(false);
  });

  it.each([
    ["schema", 2],
    ["id", "has spaces"],
    ["id", "x".repeat(201)],
    ["sessionId", 4],
    ["parents", "a"],
    ["parents", [4]],
    ["parents", ["a"]],
    ["startedAt", "now"],
    ["startedAt", Number.NaN],
    ["updatedAt", null],
    ["durationMs", 0],
    ["durationMs", Number.POSITIVE_INFINITY],
    ["breakMs", -1],
    ["autoBreak", "no"],
    ["crop", "kale"],
    ["source", "import"],
    ["phase", "pause"],
    ["status", "stopped"],
    ["deadline", "soon"],
    ["focusEndedAt", undefined],
    ["remainingMs", -5],
    ["tags", "work"],
    ["tags", [1]],
    ["notePath", 7],
    ["intervals", []],
    ["intervals", "none"],
  ])("rejects a revision whose %s is %j", (field, value) => {
    expect(isRevision(damaged(finished(), field, value))).toBe(false);
  });

  it("rejects intervals that are malformed, out of order or overlapping", () => {
    const base = finished();
    const bad = (intervals: unknown) => isRevision({ ...base, intervals });
    expect(bad([null])).toBe(false);
    expect(bad([{ start: "x", end: START }])).toBe(false);
    expect(bad([{ start: START - 1, end: START }])).toBe(false);
    expect(bad([{ start: START + 2, end: START + 1 }])).toBe(false);
    expect(
      bad([
        { start: START, end: START + 10 },
        { start: START + 5, end: START + 20 },
      ]),
    ).toBe(false);
    expect(
      bad([
        { start: START, end: START + 10 },
        { start: START + 10, end: START + 20 },
      ]),
    ).toBe(true);
  });

  it("allows an open interval only on the last interval of a running focus", () => {
    const open = [{ start: START, end: null }];
    expect(isRevision({ ...finished(), intervals: open })).toBe(false);
    expect(isRevision({ ...running(), intervals: open })).toBe(true);
    expect(
      isRevision({
        ...running(),
        intervals: [
          { start: START, end: null },
          { start: START + 10, end: START + 20 },
        ],
      }),
    ).toBe(false);
    expect(isRevision({ ...running(), intervals: [{ start: START, end: START + 5 }] })).toBe(false);
  });

  it("requires a deadline exactly while the timer runs", () => {
    expect(isRevision({ ...running(), deadline: null })).toBe(false);
    expect(isRevision({ ...finished(), deadline: START })).toBe(false);
    expect(isRevision({ ...waitingBreak(), deadline: START })).toBe(false);
  });

  it("requires the phase, status and focus end to agree", () => {
    expect(isRevision({ ...finished(), status: "running", deadline: START })).toBe(false);
    expect(isRevision({ ...finished(), status: "waiting" })).toBe(false);
    expect(isRevision({ ...running(), focusEndedAt: START })).toBe(false);
    expect(isRevision({ ...waitingBreak(), focusEndedAt: null })).toBe(false);
    expect(isRevision({ ...waitingBreak(), status: "completed" })).toBe(false);
    expect(isRevision({ ...running(), status: "waiting", deadline: null })).toBe(false);
    expect(isRevision({ ...finished(), status: "cancelled" })).toBe(true);
  });
});

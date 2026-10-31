import { describe, expect, it } from "vitest";
import { clamp01, timerDisplay } from "@/lib/timer/display";
import { focusSession } from "./helpers/sessions";
import type { Revision } from "@/lib/timer/types";

const MINUTE = 60_000;
const draft = { minutes: 25, crop: "carrot" } as const;
const running = (extra: Partial<Revision>) =>
  focusSession("s", new Date(2026, 9, 31, 9), 25, {
    phase: "focus",
    status: "running",
    focusEndedAt: null,
    crop: "pumpkin",
    breakMs: 5 * MINUTE,
    ...extra,
  });

describe("what the timer shows", () => {
  it("shows the draft's whole duration and crop, with a still sun, before a session", () => {
    expect(timerDisplay(undefined, 123, draft)).toEqual({
      remaining: 25 * MINUTE,
      crop: "carrot",
      progress: 0,
      clockProgress: 0,
      clockRate: 0,
      resting: false,
    });
  });

  it("grows the crop and moves the sun together through a running focus", () => {
    const display = timerDisplay(running({}), 10 * MINUTE, draft);
    expect(display.crop).toBe("pumpkin");
    expect(display.remaining).toBe(10 * MINUTE);
    expect(display.progress).toBeCloseTo(0.6, 9);
    expect(display.clockProgress).toBeCloseTo(0.6, 9);
    // The sun crosses the sky in the 25 minutes of the focus: 1 / 1500 of it each second.
    expect(display.clockRate).toBeCloseTo(1 / 1500, 9);
    expect(display.resting).toBe(false);
  });

  it("holds the sun still while the focus is paused", () => {
    const display = timerDisplay(running({ status: "paused" }), 10 * MINUTE, draft);
    expect(display.clockRate).toBe(0);
    expect(display.clockProgress).toBeCloseTo(0.6, 9);
  });

  it("keeps the crop grown, and the sun at dawn, while the break waits to be started", () => {
    const waiting = running({ phase: "break", status: "waiting" });
    const display = timerDisplay(waiting, 5 * MINUTE, draft);
    expect(display.progress).toBe(1);
    expect(display.clockProgress).toBe(0);
    expect(display.clockRate).toBe(0);
    expect(display.resting).toBe(false);
  });

  it("is resting once the break runs, with the sun crossing the sky in the break's length", () => {
    const display = timerDisplay(running({ phase: "break" }), 2 * MINUTE, draft);
    expect(display.resting).toBe(true);
    expect(display.progress).toBe(1);
    expect(display.clockProgress).toBeCloseTo(0.6, 9);
    expect(display.clockRate).toBeCloseTo(1 / 300, 9);
  });

  it("is still resting while a break is paused", () => {
    const display = timerDisplay(running({ phase: "break", status: "paused" }), MINUTE, draft);
    expect(display.resting).toBe(true);
    expect(display.clockRate).toBe(0);
  });

  it("never reports a phase as more than finished or not yet begun", () => {
    expect(timerDisplay(running({}), -3 * MINUTE, draft).progress).toBe(1);
    expect(timerDisplay(running({}), 40 * MINUTE, draft).clockProgress).toBe(0);
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.25)).toBe(0.25);
    expect(clamp01(2)).toBe(1);
  });

  it("does not move the sun once the session is done", () => {
    const done = focusSession("d", new Date(2026, 9, 31, 9), 25);
    const display = timerDisplay({ ...done, status: "running" }, 0, draft);
    expect(display.clockRate).toBe(0);
    expect(display.resting).toBe(false);
  });
});

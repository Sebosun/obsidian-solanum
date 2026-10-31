import { describe, expect, it } from "vitest";
import { easeOutBack, plotEntrance, swapFrame } from "@/lib/scene/motion";
import { CROP_SWAP, PLOT_ENTRANCE } from "@/lib/scene/constants";

describe("easing", () => {
  it("starts at zero, ends at one and overshoots in between", () => {
    expect(easeOutBack(0, 1.5)).toBeCloseTo(0, 10);
    expect(easeOutBack(1, 1.5)).toBeCloseTo(1, 10);
    const peak = Math.max(...Array.from({ length: 99 }, (_, i) => easeOutBack((i + 1) / 100, 1.5)));
    expect(peak).toBeGreaterThan(1.05);
    expect(peak).toBeLessThan(1.4);
  });
});

describe("swapping crops", () => {
  const duration = CROP_SWAP.durationSeconds;

  it("grows the new crop in with a small overshoot and settles upright", () => {
    expect(swapFrame("in", 0)).toMatchObject({ scale: 0, done: false });
    const early = swapFrame("in", duration * 0.3);
    expect(early.scale).toBeGreaterThan(0);
    expect(early.scale).toBeLessThan(1);
    const overshoot = Math.max(
      ...Array.from({ length: 50 }, (_, i) => swapFrame("in", (duration * (i + 1)) / 50).scale),
    );
    expect(overshoot).toBeGreaterThan(1);
    expect(swapFrame("in", duration)).toEqual({ scale: 1, spin: 0, done: true });
    expect(swapFrame("in", duration * 5)).toEqual({ scale: 1, spin: 0, done: true });
  });

  it("shrinks the old crop away while it turns, and is gone at the end", () => {
    expect(swapFrame("out", 0)).toMatchObject({ scale: 1, spin: 0, done: false });
    const middle = swapFrame("out", duration / 2);
    expect(middle.scale).toBeGreaterThan(0);
    expect(middle.scale).toBeLessThan(1);
    expect(Math.abs(middle.spin)).toBeGreaterThan(0);
    expect(swapFrame("out", duration)).toMatchObject({ scale: 0, done: true });
  });

  it("never scales below zero, whatever the clock does", () => {
    for (const direction of ["in", "out"] as const) {
      for (const elapsed of [-1, 0, 0.1, 10]) {
        expect(swapFrame(direction, elapsed).scale).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("switches instantly under reduced motion", () => {
    expect(swapFrame("in", 0, true)).toEqual({ scale: 1, spin: 0, done: true });
    expect(swapFrame("out", 0, true)).toEqual({ scale: 0, spin: 0, done: true });
  });
});

describe("calendar plots appearing", () => {
  it("staggers plots so later ones start after earlier ones", () => {
    const at = PLOT_ENTRANCE.staggerSeconds * 10 * 0.5;
    expect(plotEntrance(at, 0).scale).toBeGreaterThan(0);
    expect(plotEntrance(at, 10).scale).toBe(0);
    expect(plotEntrance(at, 10).done).toBe(false);
  });

  it("finishes at rest, and not at all under reduced motion", () => {
    const end = PLOT_ENTRANCE.durationSeconds + PLOT_ENTRANCE.staggerSeconds * 30;
    expect(plotEntrance(end, 30)).toEqual({ scale: 1, done: true });
    expect(plotEntrance(0, 30, true)).toEqual({ scale: 1, done: true });
  });
});

import { describe, expect, it } from "vitest";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  arcDots,
  boardLayout,
  boardPoint,
  clockCells,
  digitCenterFraction,
} from "@/lib/scene/clockBoard";
import { SUN_CLOCK } from "@/lib/scene/constants";
import { sunState } from "@/lib/scene/sunClock";

describe("the clock board", () => {
  it("measures the board from its own constants, so it scales as one piece", () => {
    expect(BOARD_WIDTH).toBeCloseTo(2 * SUN_CLOCK.board.halfWidth, 9);
    expect(BOARD_HEIGHT).toBeGreaterThan(SUN_CLOCK.arcRadiusY);
    expect(BOARD_WIDTH).toBeGreaterThan(2 * SUN_CLOCK.arcRadiusX);
  });

  it("puts the sun's whole path, with its glow, on the board", () => {
    const glow = Math.max(...SUN_CLOCK.sunLayers.map((layer) => layer.radius));
    for (const p of [0, 0.25, 0.5, 0.75, 1]) {
      const { x, y } = sunState(p);
      const at = boardPoint(x, y);
      expect(at.x - glow).toBeGreaterThanOrEqual(0);
      expect(at.x + glow).toBeLessThanOrEqual(BOARD_WIDTH);
      expect(at.y - glow).toBeGreaterThanOrEqual(0);
      expect(at.y + glow).toBeLessThanOrEqual(BOARD_HEIGHT);
    }
  });

  it("traces the arc with dots, every tenth one larger", () => {
    const dots = arcDots();
    expect(dots).toHaveLength(SUN_CLOCK.arcDots + 1);
    expect(dots.filter((dot) => dot.major).map((dot) => dot.index)).toEqual([0, 10, 20, 30, 40]);
    const major = dots.find((dot) => dot.major)!;
    const minor = dots.find((dot) => !dot.major)!;
    expect(major.radius).toBeGreaterThan(minor.radius);
    expect(major.opacity).toBeGreaterThan(minor.opacity);
    const first = sunState(0);
    expect(dots[0].x).toBeCloseTo(boardPoint(first.x, first.y).x, 9);
    expect(dots[20].x).toBeCloseTo(BOARD_WIDTH / 2, 9);
  });

  it("gives every character a cell of fixed width, narrower for the colon", () => {
    const cells = clockCells("18:23");
    expect(cells.map((cell) => cell.char)).toEqual(["1", "8", ":", "2", "3"]);
    expect(cells[0].width).toBe(cells[1].width);
    expect(cells[2].width).toBeLessThan(cells[0].width);
    const width = (text: string) => clockCells(text).reduce((sum, cell) => sum + cell.width, 0);
    expect(width("11:11")).toBeCloseTo(width("00:00"), 9);
    expect(width("00:00") * SUN_CLOCK.digitSize).toBeLessThan(2 * SUN_CLOCK.arcRadiusX);
    expect(width("00:00") * SUN_CLOCK.digitSize).toBeGreaterThan(SUN_CLOCK.arcRadiusX * 0.8);
  });

  it("sizes the board so its top never passes the top of the scene", () => {
    const { aspect, maxWidthInHeights, lift } = boardLayout();
    expect(aspect).toBeCloseTo(BOARD_WIDTH / BOARD_HEIGHT, 9);
    // At the widest, the part above the base line fits between the baseline and the top margin.
    const height = maxWidthInHeights / aspect;
    const above = height * (SUN_CLOCK.board.top / BOARD_HEIGHT);
    expect(above).toBeCloseTo(SUN_CLOCK.baselineFraction - SUN_CLOCK.topMargin, 9);
    expect(lift).toBeGreaterThan(0);
    expect(lift).toBeLessThan(0.3);
  });

  it("centres the digits inside the arc", () => {
    const fraction = digitCenterFraction();
    expect(fraction).toBeGreaterThan(0.2);
    expect(fraction).toBeLessThan(0.7);
  });
});

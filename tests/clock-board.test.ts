import { describe, expect, it } from "vitest";
import {
  BOARD_WIDTH,
  arcDots,
  boardHeight,
  boardLayout,
  boardPoint,
  clockCells,
  digitCenterFraction,
  ringStretch,
} from "@/lib/scene/clockBoard";
import { SUN_CLOCK } from "@/lib/scene/constants";
import { sunState } from "@/lib/scene/sunClock";

describe("the clock board", () => {
  it("measures the board from its own constants, so it scales as one piece", () => {
    expect(BOARD_WIDTH).toBeCloseTo(2 * SUN_CLOCK.board.halfWidth, 9);
    expect(boardHeight()).toBeGreaterThan(SUN_CLOCK.arcRadiusY);
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
      expect(at.y + glow).toBeLessThanOrEqual(boardHeight());
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

  it("sizes the board so its top never passes the top of the scene, at any stretch", () => {
    for (const stretch of [0.5, 1, 1.8]) {
      const { aspect, maxWidthInHeights, lift } = boardLayout(stretch);
      expect(aspect).toBeCloseTo(BOARD_WIDTH / boardHeight(stretch), 9);
      // At the widest, the part above the base line fits between the baseline and the top margin.
      const height = maxWidthInHeights / aspect;
      const above =
        height * ((boardHeight(stretch) - SUN_CLOCK.board.below) / boardHeight(stretch));
      expect(above).toBeCloseTo(SUN_CLOCK.baselineFraction - SUN_CLOCK.topMargin, 9);
      expect(lift).toBeGreaterThan(0);
      expect(lift).toBeLessThan(0.3);
    }
  });

  it("makes the arc span most of the scene's width", () => {
    const { widthInScenes } = boardLayout();
    const arcWidthInScenes = (widthInScenes * 2 * SUN_CLOCK.arcRadiusX) / BOARD_WIDTH;
    expect(arcWidthInScenes).toBeCloseTo(SUN_CLOCK.ring.fill, 9);
    expect(SUN_CLOCK.ring.fill).toBeGreaterThan(0.9);
  });

  it("stretches the arc taller in a tall scene and flatter in a short, wide one", () => {
    const tall = ringStretch(320, 720);
    const square = ringStretch(600, 600);
    const wide = ringStretch(900, 300);
    expect(tall).toBeGreaterThan(square);
    expect(square).toBeGreaterThan(wide);
    expect(tall).toBeLessThanOrEqual(SUN_CLOCK.ring.maxStretch);
    expect(wide).toBeGreaterThanOrEqual(SUN_CLOCK.ring.minStretch);
  });

  it("keeps the same shape when the scene is only scaled up, which is what resolution does", () => {
    expect(ringStretch(640, 1440)).toBeCloseTo(ringStretch(320, 720), 9);
    expect(ringStretch(900, 600)).toBeCloseTo(ringStretch(450, 300), 9);
  });

  it("fits the ring and the sun's glow in the scene whenever the stretch is not at a limit", () => {
    for (const [width, height] of [
      [320, 720],
      [400, 300],
      [480, 720],
      [900, 900],
      [560, 400],
    ]) {
      const stretch = ringStretch(width, height);
      const unit = (boardLayout().widthInScenes * width) / BOARD_WIDTH;
      const arcTop = (SUN_CLOCK.arcRadiusY * stretch + SUN_CLOCK.board.headroom) * unit;
      expect(arcTop).toBeLessThanOrEqual(SUN_CLOCK.baselineFraction * height + 1e-6);
      expect(arcTop).toBeGreaterThan(0);
    }
  });

  it("falls back to a true half circle while the scene has no size yet", () => {
    expect(ringStretch(0, 0)).toBe(1);
    expect(ringStretch(Number.NaN, 300)).toBe(1);
  });

  it("centres the digits inside the arc, whatever its stretch", () => {
    for (const stretch of [0.5, 1, 1.8]) {
      const fraction = digitCenterFraction(stretch);
      expect(fraction).toBeGreaterThan(0.2);
      expect(fraction).toBeLessThan(0.7);
    }
  });
});

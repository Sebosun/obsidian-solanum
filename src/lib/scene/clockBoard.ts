import { SUN_CLOCK } from "@/lib/scene/constants";

const { board, ring } = SUN_CLOCK;

/** The board's width in clock units: what the SVG's viewBox shows. */
export const BOARD_WIDTH = board.halfWidth * 2;

/**
 * The board's height in clock units. `stretch` makes the arc taller (above 1) or flatter (below 1)
 * than a true half circle, so that the ring can fill scenes of any shape.
 */
export function boardHeight(stretch = 1): number {
  return SUN_CLOCK.arcRadiusY * stretch + board.headroom + board.below;
}

/** Clock units (y up from the arc's base line) as SVG coordinates (y down from the board's top). */
export function boardPoint(x: number, y: number, stretch = 1): { x: number; y: number } {
  return {
    x: x + board.halfWidth,
    y: SUN_CLOCK.arcRadiusY * stretch + board.headroom - y * stretch,
  };
}

export interface ArcDot {
  index: number;
  major: boolean;
  x: number;
  y: number;
  radius: number;
  opacity: number;
}

/** The dots that trace the sun's path, from the left horizon over the top to the right one. */
export function arcDots(stretch = 1): ArcDot[] {
  const { major, minor, majorEvery } = SUN_CLOCK.arcDot;
  return Array.from({ length: SUN_CLOCK.arcDots + 1 }, (_, index) => {
    const angle = Math.PI - (index / SUN_CLOCK.arcDots) * Math.PI;
    const isMajor = index % majorEvery === 0;
    const at = boardPoint(
      Math.cos(angle) * SUN_CLOCK.arcRadiusX,
      Math.sin(angle) * SUN_CLOCK.arcRadiusY,
      stretch,
    );
    return { index, major: isMajor, ...at, ...(isMajor ? major : minor) };
  });
}

export interface ClockCell {
  char: string;
  /** Width of the cell in ems. */
  width: number;
}

/** One fixed-width cell per character, so a digit that changes never moves its neighbours. */
export function clockCells(text: string): ClockCell[] {
  return [...text].map((char) => ({
    char,
    width: char === ":" ? SUN_CLOCK.digitCell.colon : SUN_CLOCK.digitCell.digit,
  }));
}

/** Where the digits' middle sits, as a fraction of the board's height from its top. */
export function digitCenterFraction(stretch = 1): number {
  const middle = (SUN_CLOCK.digitY + SUN_CLOCK.digitSize * 0.35) * stretch;
  return (boardHeight(stretch) - board.below - middle) / boardHeight(stretch);
}

export interface BoardLayout {
  /** Width ÷ height of the board. */
  aspect: number;
  /** How wide the board is, in scene widths, so that the arc spans `ring.fill` of the scene. */
  widthInScenes: number;
  /** The widest the board may be, in scene heights, so it keeps clear of the top edge. */
  maxWidthInHeights: number;
  /** How far the board reaches below its base line, as a fraction of its own height. */
  lift: number;
}

export function boardLayout(stretch = 1): BoardLayout {
  const height = boardHeight(stretch);
  const aspect = BOARD_WIDTH / height;
  const aboveBaseline = SUN_CLOCK.baselineFraction - SUN_CLOCK.topMargin;
  return {
    aspect,
    widthInScenes: (ring.fill * BOARD_WIDTH) / (2 * SUN_CLOCK.arcRadiusX),
    maxWidthInHeights: (aboveBaseline * aspect * height) / (height - board.below),
    lift: board.below / height,
  };
}

/**
 * How much to stretch the arc's height for a scene of this size, so the ring fills the width and
 * as much of the height above the base line as it can, without leaving the scene.
 */
export function ringStretch(width: number, height: number): number {
  if (!(width > 0) || !(height > 0)) return 1;
  const unit = (boardLayout().widthInScenes * width) / BOARD_WIDTH; // pixels per clock unit
  const room = (SUN_CLOCK.baselineFraction - SUN_CLOCK.topMargin) * height; // above the base line
  const stretch = (room / unit - board.headroom) / SUN_CLOCK.arcRadiusY;
  return Math.min(ring.maxStretch, Math.max(ring.minStretch, stretch));
}

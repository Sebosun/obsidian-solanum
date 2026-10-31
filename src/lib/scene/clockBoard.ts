import { SUN_CLOCK } from "@/lib/scene/constants";

const { board } = SUN_CLOCK;

/** The board's size in clock units: what the SVG's viewBox shows. */
export const BOARD_WIDTH = board.halfWidth * 2;
export const BOARD_HEIGHT = board.top - board.bottom;

/** Clock units (y up from the arc's base line) as SVG coordinates (y down from the board's top). */
export function boardPoint(x: number, y: number): { x: number; y: number } {
  return { x: x + board.halfWidth, y: board.top - y };
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
export function arcDots(): ArcDot[] {
  const { major, minor, majorEvery } = SUN_CLOCK.arcDot;
  return Array.from({ length: SUN_CLOCK.arcDots + 1 }, (_, index) => {
    const angle = Math.PI - (index / SUN_CLOCK.arcDots) * Math.PI;
    const isMajor = index % majorEvery === 0;
    const at = boardPoint(
      Math.cos(angle) * SUN_CLOCK.arcRadiusX,
      Math.sin(angle) * SUN_CLOCK.arcRadiusY,
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
export function digitCenterFraction(): number {
  const middle = SUN_CLOCK.digitY + SUN_CLOCK.digitSize * 0.35;
  return (board.top - middle) / BOARD_HEIGHT;
}

export interface BoardLayout {
  /** Width ÷ height of the board. */
  aspect: number;
  /** The widest the board may be, in scene heights, so it keeps clear of the top edge. */
  maxWidthInHeights: number;
  /** How far the board reaches below its base line, as a fraction of its own height. */
  lift: number;
}

export function boardLayout(): BoardLayout {
  const aspect = BOARD_WIDTH / BOARD_HEIGHT;
  const aboveBaseline = SUN_CLOCK.baselineFraction - SUN_CLOCK.topMargin;
  return {
    aspect,
    maxWidthInHeights: (aboveBaseline * BOARD_HEIGHT * aspect) / board.top,
    lift: -board.bottom / BOARD_HEIGHT,
  };
}

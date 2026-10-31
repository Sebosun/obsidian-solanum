import { CLOCK_DIGITS } from "@/lib/scene/constants";

export interface ClockCell {
  char: string;
  /** Width of the cell in ems. */
  width: number;
}

/** One fixed-width cell per character, so a digit that changes never moves its neighbours. */
export function clockCells(text: string): ClockCell[] {
  return [...text].map((char) => ({
    char,
    width: char === ":" ? CLOCK_DIGITS.cell.colon : CLOCK_DIGITS.cell.digit,
  }));
}

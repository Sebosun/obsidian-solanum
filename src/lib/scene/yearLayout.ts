import { YEAR_STACKS } from "@/lib/scene/constants";
import type { YearStack } from "@/lib/harvest/year";

const ROWS = 12 / YEAR_STACKS.columns;

/** Ground position of a month's stack, centred on the origin, January at the back left. */
export function stackPosition(index: number): [number, number, number] {
  return [
    ((index % YEAR_STACKS.columns) - (YEAR_STACKS.columns - 1) / 2) * YEAR_STACKS.pitchX,
    0,
    (Math.floor(index / YEAR_STACKS.columns) - (ROWS - 1) / 2) * YEAR_STACKS.pitchZ,
  ];
}

/** Height of a stack, from the ground to the top of its top crate. */
export function stackHeight(stack: Pick<YearStack, "crates" | "empty">): number {
  if (stack.empty) return YEAR_STACKS.emptyCrateHeight;
  return (stack.crates - 1) * YEAR_STACKS.crateStep + YEAR_STACKS.crateHeight;
}

/** Where plant number `slot` of `count` stands on the floor of a crate, relative to its centre. */
export function cratePlantOffset(slot: number, count: number): [number, number] {
  const columns = YEAR_STACKS.plantColumns;
  const rows = Math.ceil(count / columns);
  const column = slot % columns;
  const row = Math.floor(slot / columns);
  return [
    (column - (columns - 1) / 2) * (YEAR_STACKS.crateWidth / (columns + 0.6)),
    (row - (rows - 1) / 2) * (YEAR_STACKS.crateDepth / (YEAR_STACKS.plantColumns - 1.3)),
  ];
}

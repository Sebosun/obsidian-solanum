import { MONTHS_PER_YEAR, YEAR_STACKS } from "@/lib/scene/constants";

export const YEAR_ROWS = MONTHS_PER_YEAR / YEAR_STACKS.columns;

/** Ground position of a month's stack, centred on the origin, January at the back left. */
export function stackPosition(index: number): [number, number, number] {
  return [
    ((index % YEAR_STACKS.columns) - (YEAR_STACKS.columns - 1) / 2) * YEAR_STACKS.pitchX,
    0,
    (Math.floor(index / YEAR_STACKS.columns) - (YEAR_ROWS - 1) / 2) * YEAR_STACKS.pitchZ,
  ];
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

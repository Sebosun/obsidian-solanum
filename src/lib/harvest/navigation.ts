const ARROWS: Record<string, { dx: number; dy: number }> = {
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
};

/** The bed an arrow key moves to in a grid of `columns`, or null for any other key. */
export function adjacentBed(
  current: number | null,
  key: string,
  columns: number,
  count: number,
): number | null {
  const move = ARROWS[key];
  if (!move) return null;
  if (current === null) return 0;
  const column = Math.min(columns - 1, Math.max(0, (current % columns) + move.dx));
  const row = Math.max(0, Math.floor(current / columns) + move.dy);
  const target = row * columns + column;
  return target >= count ? current : target;
}

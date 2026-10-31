import { HARVEST_BLOCKS } from "@/lib/scene/constants";
import { SEASON_THEMES, type SeasonId } from "@/lib/scene/seasons";

interface EmptyPlotsProps {
  columns: number;
  rows: number;
  season: SeasonId;
}

const SOIL = "#6b4a30";
/** Low enough to sit well under the shortest harvest, so the grid reads as waiting, not planted. */
const PLOT_HEIGHT = 0.08;

/** The grid of a month with no harvests: an empty plot where each one would stand. */
export function EmptyPlots({ columns, rows, season }: EmptyPlotsProps) {
  const { size, pitch, topThickness } = HARVEST_BLOCKS;
  const top = SEASON_THEMES[season].platform.top;
  const plots = [];
  for (let row = 0; row < rows; row += 1)
    for (let column = 0; column < columns; column += 1)
      plots.push({
        key: `${column}-${row}`,
        x: (column - (columns - 1) / 2) * pitch,
        z: (row - (rows - 1) / 2) * pitch,
      });
  return (
    <group name="empty-plots">
      {plots.map(({ key, x, z }) => (
        <group key={key} name="empty-plot" position={[x, 0, z]}>
          <mesh position={[0, PLOT_HEIGHT / 2, 0]}>
            <boxGeometry args={[size, PLOT_HEIGHT, size]} />
            <meshStandardMaterial color={SOIL} roughness={1} />
          </mesh>
          <mesh name="empty-plot-top" position={[0, PLOT_HEIGHT + topThickness / 2, 0]}>
            <boxGeometry args={[size, topThickness, size]} />
            <meshStandardMaterial color={top} roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

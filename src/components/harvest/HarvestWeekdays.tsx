import { Html } from "@react-three/drei";
import { WEEKDAY_INITIALS } from "@/lib/harvest/weekdays";
import { HARVEST_GRID } from "@/lib/scene/constants";

interface HarvestWeekdaysProps {
  /** World z of the header row. */
  z: number;
}

const SPACER_DEPTH = 0.3;

export function HarvestWeekdays({ z }: HarvestWeekdaysProps) {
  const spacerWidth = HARVEST_GRID.columns * HARVEST_GRID.cellSpacing;
  return (
    <group name="weekday-header">
      {/* Invisible, but included in the camera fit so the labels are never cropped. */}
      <mesh visible={false} position={[0, 0, z]}>
        <boxGeometry args={[spacerWidth, 0.01, SPACER_DEPTH]} />
      </mesh>
      {WEEKDAY_INITIALS.map((initial, column) => (
        <Html
          key={column}
          center
          position={[(column - (HARVEST_GRID.columns - 1) / 2) * HARVEST_GRID.cellSpacing, 0, z]}
          style={{ pointerEvents: "none" }}
          zIndexRange={[5, 0]}
        >
          <span className="solanum-weekday-label">{initial}</span>
        </Html>
      ))}
    </group>
  );
}

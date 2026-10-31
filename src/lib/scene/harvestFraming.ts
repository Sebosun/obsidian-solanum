import { HARVEST_GRID, HARVEST_SCENE } from "@/lib/scene/constants";

const [, CAMERA_HEIGHT, CAMERA_DEPTH] = HARVEST_SCENE.cameraPosition;
/** Share of a ground-plane distance that survives the camera's downward tilt. */
const GROUND_FORESHORTENING = CAMERA_HEIGHT / Math.hypot(CAMERA_HEIGHT, CAMERA_DEPTH);

/** World-space z of the weekday header relative to the grid centre. */
export function weekdayHeaderOffset(rows: number): number {
  const firstRowZ = (-(rows - 1) / 2) * HARVEST_GRID.cellSpacing;
  return firstRowZ - HARVEST_SCENE.weekdayRowOffsetCells * HARVEST_GRID.cellSpacing;
}

/** Width ÷ height the scene container needs so the month fills it without dead space. */
export function harvestAspectRatio(rows: number): number {
  const width = (HARVEST_GRID.columns - 1) * HARVEST_GRID.cellSpacing + HARVEST_GRID.plotSize;
  const groundDepth =
    (rows - 1) * HARVEST_GRID.cellSpacing +
    (HARVEST_SCENE.weekdayRowOffsetCells + HARVEST_SCENE.verticalPaddingCells * 2) *
      HARVEST_GRID.cellSpacing +
    HARVEST_GRID.plotSize;
  return width / (groundDepth * GROUND_FORESHORTENING);
}

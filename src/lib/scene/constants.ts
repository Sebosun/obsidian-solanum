export const TIMER_SCENE = {
  direction: [3, 2.4, 4],
  bounds: { min: [-1.05, -0.85, -1.05], max: [1.05, 1.35, 1.05] },
  padding: 1.16,
  cameraDistance: 10,
  near: 0.1,
  far: 100,
  clockReservedPixels: 90,
} as const;

export const CLOCK_TYPOGRAPHY = {
  minimumPixels: 28,
  maximumPixels: 42,
  widthRatio: 0.13,
  baselinePixels: 42,
  curveSegments: 8,
  depth: 0,
  renderPriority: 1,
  cameraPosition: [0, 0, 100] as [number, number, number],
} as const;

/** Layout of the month calendar in world units (one unit ≈ one plot width). */
export const HARVEST_GRID = {
  columns: 7,
  cellSpacing: 1.3,
  plotSize: 1.2,
  cropSpacing: 0.3,
  cropBaseHeight: 0.1,
  maxCropsPerPlot: 9,
} as const;

export const HARVEST_SCENE = {
  // Mostly top-down with no yaw, so columns line up with the weekday header.
  cameraPosition: [0, 14, 5] as [number, number, number],
  initialZoom: 30,
  fitMargin: 1.05,
  // Distance from the first plot row to the weekday header, in cell widths.
  weekdayRowOffsetCells: 0.82,
  // Spare room above the header and below the last row, in cell widths.
  verticalPaddingCells: 0.06,
} as const;

export const GROWTH_MOTION = {
  transitionSeconds: 0.65,
  incomingScale: 0.92,
  outgoingScaleChange: 0.02,
  swayRadians: 0.025,
  swaySpeed: 1.3,
  basePosition: [0, -0.55, 0] as [number, number, number],
} as const;

export const HARVEST_FLOURISH = {
  durationSeconds: 1.2,
  lift: 0.06,
  scaleChange: 0.035,
  ringExpansion: 0.45,
  ringOpacity: 0.35,
} as const;

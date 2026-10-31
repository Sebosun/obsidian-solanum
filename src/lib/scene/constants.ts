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

export const HARVEST_SCENE = {
  // Isometric-style view: orthographic, turned a little off-axis and tilted down. Direction only;
  // the camera is pulled back or in to fit the blocks.
  cameraPosition: [8, 10, 11] as [number, number, number],
  initialZoom: 30,
  fitMargin: 1.03,
  /** Width ÷ height of the scene box. */
  aspectRatio: 1.1,
} as const;

/** The month as a grid of raised blocks, one per harvest. World units unless noted. */
export const HARVEST_BLOCKS = {
  pitch: 1.14,
  size: 1,
  minHeight: 0.22,
  /** Extra height a block gains between zero and `fullHeightMinutes`. */
  heightRange: 1.1,
  fullHeightMinutes: 90,
  /** More than this and the month is thinned evenly, so the scene stays light. */
  maxBlocks: 144,
  minColumns: 6,
  maxColumns: 12,
  /** Columns follow √(blocks × this), which keeps the grid a little wider than deep. */
  columnSpread: 1.6,
  topThickness: 0.07,
  maxTags: 3,
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

/** Swapping the planted crop: the old one shrinks away, the new one pops in. Seconds and radians. */
export const CROP_SWAP = {
  durationSeconds: 0.45,
  overshoot: 1.6,
  spinRadians: 0.9,
} as const;

/** Calendar plots rising into place when a month opens. */
export const PLOT_ENTRANCE = {
  durationSeconds: 0.32,
  staggerSeconds: 0.014,
  overshoot: 1.3,
} as const;

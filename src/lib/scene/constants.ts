export const TIMER_SCENE = {
  direction: [3, 2.4, 4],
  /** Centre of the plot and crop, which the camera looks at before the clock is added to the frame. */
  target: [0, 0.25, 0],
  bounds: { min: [-1.05, -0.85, -1.05], max: [1.05, 1.35, 1.05] },
  padding: 1.08,
  cameraDistance: 10,
  near: 0.1,
  far: 100,
} as const;

/** Countdown text: size is in world units, set by the sun clock. */
export const CLOCK_TYPOGRAPHY = {
  depth: 0,
  curveSegments: 8,
} as const;

/**
 * The clock that hangs behind the crop: a sun crossing an arc, with the time as large faint digits.
 * Lengths are world units; the board is measured in the camera's own screen plane.
 */
export const SUN_CLOCK = {
  arcRadiusX: 3.8,
  arcRadiusY: 3.6,
  /** Where the arc's base line sits, above the plot's centre. */
  baseY: 0.5,
  /** How far behind the plot, along the line of sight. Only the order in front matters. */
  depth: 3.5,
  /** Everything the clock draws, relative to the plot's centre on screen, for framing the camera. */
  boardHalfWidth: 4.3,
  boardBottom: -0.5,
  boardTop: 4.8,
  digitSize: 1.1,
  digitY: 1.7,
  arcDots: 40,
  /** Layers of the sun disc: radius and opacity at full brightness. */
  sunLayers: [
    { radius: 0.34, opacity: 0.95 },
    { radius: 0.62, opacity: 0.22 },
    { radius: 0.95, opacity: 0.09 },
  ],
  /** What is left of the sun's strength as time runs out. */
  endBrightness: 0.08,
  endScale: 0.72,
  endLight: 0.12,
  endAmbient: 0.42,
  /** Colour of the sun at the start, halfway and at the end. */
  colors: [0xffe9a8, 0xffb86b, 0xff8a3d],
  digitOpacity: { start: 0.34, end: 0.22 },
  /** How quickly the drawn sun catches up with where the clock says it should be, per second. */
  smoothing: 6,
  /** A digit that changes rolls out downwards and the new one drops in from above. */
  digitRoll: { seconds: 0.45, travel: 0.55 },
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

/** The year as twelve stacks of crates, four across. A taller stack is a busier month. World units. */
export const YEAR_STACKS = {
  columns: 4,
  crateWidth: 1.9,
  crateDepth: 1.5,
  crateHeight: 0.6,
  /** Height gained per crate; a little more than the crate so stacks show their joins. */
  crateStep: 0.62,
  pitchX: 2.5,
  pitchZ: 3.1,
  /** The busiest month gets this many crates, and every other month is scaled against it. */
  maxCrates: 6,
  /** Fewest minutes a crate may stand for, so a light year does not look like a tall one. */
  minCrateMinutes: 120,
  crateRoundingMinutes: 30,
  /** Plants in a full top crate, in a grid of `plantColumns` across. */
  topPlants: 15,
  plantColumns: 5,
  minTopPlants: 3,
  /** Height of the single bare crate that marks a month with nothing finished. */
  emptyCrateHeight: 0.3,
  /** Width ÷ height of the scene box; stacks are tall, so it is a little narrower than the month. */
  sceneAspect: 0.95,
} as const;

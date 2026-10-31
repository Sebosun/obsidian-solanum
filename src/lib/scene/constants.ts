export const TIMER_SCENE = {
  direction: [3, 2.4, 4],
  /** Centre of the plot and crop, which the camera looks at. */
  target: [0, 0.25, 0],
  bounds: { min: [-1.05, -0.85, -1.05], max: [1.05, 1.35, 1.05] },
  padding: 1.08,
  /**
   * Where the middle of the plot sits on screen, as a fraction of the scene's height from the top:
   * a touch below the middle, since the time sits above it.
   */
  plotCenter: 0.55,
  cameraDistance: 10,
  near: 0.1,
  far: 100,
} as const;

/**
 * The sun that counts a phase down. It is not drawn: it sets the light, the colour of the progress
 * bar and how dark the sky grows. Lengths are the arc it would cross, which places the light.
 */
export const SUN_CLOCK = {
  arcRadiusX: 3.8,
  arcRadiusY: 3.6,
  /** What is left of the sun's strength as time runs out. */
  endBrightness: 0.08,
  endScale: 0.72,
  endLight: 0.12,
  endAmbient: 0.42,
  /** Colour of the sun at the start, halfway and at the end. */
  colors: [0xffe9a8, 0xffb86b, 0xff8a3d],
  /** How quickly the sun catches up with where the clock says it should be, per second. */
  smoothing: 6,
} as const;

/** The digits of the time: each character has a cell of fixed width, and a changed digit flips. */
export const CLOCK_DIGITS = {
  /** Cell widths in ems, so changing digits never shift the row. */
  cell: { digit: 0.66, colon: 0.3 },
  /**
   * A digit that changes flips like a flip clock's: the top half folds down to show the new digit,
   * then the new bottom half drops into place. The seconds are for the whole flip, half for each.
   */
  flip: { seconds: 0.5 },
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
  /** A month with nothing in it still shows a plinth this many blocks deep. */
  emptyRows: 3,
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

/**
 * The break: a cat asleep on a pillow on the screen's left, with a mug of coffee hovering on its right. There is no floor:
 * the pillow is what everything rests on. Lengths are world units in the same space as the timer's
 * plot, so the same camera frames it.
 */
export const BREAK_SCENE = {
  /** The cat model, by its path under the plugin's assets folder. */
  catModel: "break/Cat_sleeping.glb",
  /** Height of the pillow's base, which is as low as anything in the scene goes. */
  groundY: -0.54,
  /** What the camera must keep in view, in place of the plot's bounds. */
  bounds: { min: [-0.75, -0.6, -0.75], max: [0.75, 0.8, 0.75] } as const,
  /** The middle of what is framed, a touch below the middle of the view: the time sits above it. */
  center: 0.46,
  /** The pillow model: how wide it is in the scene, where it sits and how it is turned. */
  pillow: {
    model: "break/pillow.glb",
    width: 1.55,
    turn: -0.75,
    position: [-0.2, 0.12] as [number, number],
  },
  /** The cat lies on the pillow's floor, sunk a little into it, and is turned against the pillow. */
  cat: { scale: 1.35, sink: -0.07, turn: 0 },
  /** The mug model, which hangs in the air beside the pillow and sways a little. */
  mug: {
    model: "break/mug.glb",
    position: [0.78, -0.3] as [number, number],
    /** How tall it stands, and the height of its base above the ground (in the air, not on it). */
    height: 0.24,
    hover: 0.1,
    /** How far it rises and falls, and how long a full sway takes. */
    bob: 0.025,
    bobSeconds: 4.5,
    /** Where the coffee stands, as a share of the mug's height, so the steam starts there. */
    coffeeLevel: 0.88,
    turn: 0.6,
  },
  steam: { count: 56, height: 0.8, turns: 1.6, riseSeconds: 5, size: 0.16 },
} as const;

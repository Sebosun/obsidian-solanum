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

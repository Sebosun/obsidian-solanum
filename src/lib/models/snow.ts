import { FARM_PLATFORM } from "@/lib/models/platform";

/** A bank of snow on the plot's rim: where it lies on the surface and how big it is. */
export interface SnowMound {
  x: number;
  z: number;
  radius: number;
}

/** The banks that heap round the plot in winter, in world units. */
export const SNOW_MOUNDS: readonly SnowMound[] = [
  { x: 0.62, z: 0.3, radius: 0.16 },
  { x: -0.58, z: 0.38, radius: 0.14 },
  { x: 0.1, z: -0.59, radius: 0.14 },
  { x: -0.5, z: -0.45, radius: 0.12 },
  { x: 0.7, z: -0.25, radius: 0.1 },
];

export const SNOW = {
  /** Mounds are spheres squashed to this share of their height, so they lie rather than stand. */
  flattening: 0.45,
  roughness: 0.9,
  widthSegments: 12,
  heightSegments: 8,
  /** Height of the mounds' centres: the plot's planting surface. */
  y: FARM_PLATFORM.plantingSurfaceY,
} as const;

import { SUN_CLOCK } from "@/lib/scene/constants";

export interface SunState {
  /** How far through the phase this state is, clamped to 0 to 1. */
  progress: number;
  /** Position on the arc, in the clock's own plane. */
  x: number;
  y: number;
  /** 1 at the start of the session, a faint ember at the end. */
  brightness: number;
  scale: number;
  color: number;
  /** The same colour as a CSS hex string. */
  colorCss: string;
  /** Multipliers for the scene's sun and ambient light. */
  lightFactor: number;
  ambientFactor: number;
  /** Where the scene's sun light shines from, following the sun across the sky. */
  lightPosition: [number, number, number];
  /** 0 by day, towards 1 as the sky darkens. */
  dusk: number;
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const BRIGHTNESS_CURVE = 1.15;
const LIGHT_CURVE = 1.1;
const DUSK_CURVE = 1.2;
const LIGHT_REACH = { x: 2.1, base: 3, height: 2.2, z: 2 };

function mixColor(from: number, to: number, k: number): number {
  const channel = (shift: number) =>
    Math.round(lerp((from >> shift) & 255, (to >> shift) & 255, k)) << shift;
  return channel(16) | channel(8) | channel(0);
}

/** Pale gold at dawn, amber at noon, orange as it sets. */
function sunColor(progress: number): number {
  const [dawn, noon, dusk] = SUN_CLOCK.colors;
  return progress < 0.5
    ? mixColor(dawn, noon, progress * 2)
    : mixColor(noon, dusk, (progress - 0.5) * 2);
}

/** The sun, and the light with it, for `progress` through the phase (0 start, 1 end). */
export function sunState(progress: number): SunState {
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const angle = Math.PI - p * Math.PI;
  const x = Math.cos(angle) * SUN_CLOCK.arcRadiusX;
  const y = Math.sin(angle) * SUN_CLOCK.arcRadiusY;
  const color = sunColor(p);
  return {
    progress: p,
    x,
    y,
    brightness: lerp(1, SUN_CLOCK.endBrightness, p ** BRIGHTNESS_CURVE),
    scale: lerp(1, SUN_CLOCK.endScale, p),
    color,
    colorCss: `#${color.toString(16).padStart(6, "0")}`,
    lightFactor: lerp(1, SUN_CLOCK.endLight, p ** LIGHT_CURVE),
    ambientFactor: lerp(1, SUN_CLOCK.endAmbient, p),
    lightPosition: [x * LIGHT_REACH.x, LIGHT_REACH.base + y * LIGHT_REACH.height, LIGHT_REACH.z],
    dusk: p ** DUSK_CURVE,
  };
}

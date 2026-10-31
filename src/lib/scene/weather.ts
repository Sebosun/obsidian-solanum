import { Color } from "three";
import type { ParticleTheme } from "@/lib/scene/seasons";

/** The volume the weather fills, around the plot. */
export interface WeatherBounds {
  halfWidth: number;
  halfDepth: number;
  floor: number;
  ceiling: number;
}

const SPEED_SPREAD = { min: 0.7, max: 1.3 };
const SIZE_SPREAD = { min: 0.7, max: 1.4 };
/** Some particles are nearer than others: the far ones are fainter, as in a real fall. */
const PRESENCE = { min: 0.45, max: 1 };
/** A flight fades in over its first share and out over its last, and is clear between. */
const FADE = { inEnds: 0.12, outStarts: 0.8 };
/** How much of the sideways sway the depth axis gets, so drifting reads as three-dimensional. */
const DEPTH_SWAY = 0.6;

/** Small, fast, seedable generator so scenes look the same on every run. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The n-th number of a low-discrepancy sequence in this base, between 0 and 1. Unlike plain random
 * numbers, which clump and leave gaps, these spread evenly however many are taken, so the weather
 * covers the view the same on both sides.
 */
function halton(index: number, base: number): number {
  let result = 0;
  let fraction = 1 / base;
  for (let i = index; i > 0; i = Math.floor(i / base)) {
    result += (i % base) * fraction;
    fraction /= base;
  }
  return result;
}

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

interface Seed {
  lane: number;
  depth: number;
  phase: number;
  speed: number;
  /** Where in its flight the particle starts, so they are spread through the whole volume. */
  offset: number;
  /** How strong it is next to the strongest, by how near it is. */
  presence: number;
}

/**
 * A season's weather: flat buffers for the shaders, and the rules of motion. Every particle flies
 * a repeating path from one end of the volume to the other, fading in as it starts and out as it
 * ends, and goes on to its next flight while it cannot be seen. It never settles, never sits on
 * the floor and never snaps: where it is and how it looks are a pure function of the time.
 */
export class WeatherField {
  readonly positions: Float32Array;
  readonly colors: Float32Array;
  readonly alphas: Float32Array;
  /** Per particle: the turn in the picture's plane, and how face-on it is (-1 to 1). */
  readonly rotations: Float32Array;
  readonly sizes: Float32Array;
  private seeds: Seed[] = [];

  constructor(
    private theme: ParticleTheme,
    private bounds: WeatherBounds,
    seed: number,
  ) {
    const random = mulberry32(seed);
    const { count } = theme;
    // Each seed starts further along the sequences, so the scenes differ but are always even.
    const start = 1 + (seed % 997);
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.alphas = new Float32Array(count);
    this.rotations = new Float32Array(count * 2);
    this.sizes = new Float32Array(count);
    const palette = theme.colors.map((hex) => new Color(hex));
    for (let i = 0; i < count; i += 1) {
      this.seeds.push({
        lane: halton(start + i, 2),
        depth: halton(start + i, 3),
        offset: halton(start + i, 5),
        phase: random() * Math.PI * 2,
        speed: SPEED_SPREAD.min + random() * (SPEED_SPREAD.max - SPEED_SPREAD.min),
        presence: PRESENCE.min + random() * (PRESENCE.max - PRESENCE.min),
      });
      this.sizes[i] =
        theme.size * (SIZE_SPREAD.min + random() * (SIZE_SPREAD.max - SIZE_SPREAD.min));
      const color = palette[Math.floor(random() * palette.length)];
      this.colors.set([color.r, color.g, color.b], i * 3);
    }
  }

  /** Puts every particle where it is, and how it looks, at this time in seconds. */
  step(elapsedSeconds: number): void {
    const { fall, sway, swayHz, spin, flutter, opacity } = this.theme;
    const { floor, ceiling, halfWidth, halfDepth } = this.bounds;
    const span = ceiling - floor;
    this.seeds.forEach((seed, i) => {
      // `life` runs round and round from 0 to 1 and back to 0; falling grows it, rising shrinks it.
      const life = fract(seed.offset + (elapsedSeconds * fall * seed.speed) / span);
      const progress = fall > 0 ? life : 1 - life;
      const fade =
        smoothstep(0, FADE.inEnds, progress) * (1 - smoothstep(FADE.outStarts, 1, progress));
      const wave = elapsedSeconds * swayHz * Math.PI * 2 * (0.8 + 0.4 * seed.speed) + seed.phase;
      // The sideways drift fades with the particle, so it is calm at either end of its flight.
      this.positions[i * 3] = (seed.lane * 2 - 1) * halfWidth + Math.sin(wave) * sway * fade;
      this.positions[i * 3 + 1] = ceiling - life * span;
      this.positions[i * 3 + 2] =
        (seed.depth * 2 - 1) * halfDepth + Math.cos(wave * 0.9) * sway * DEPTH_SWAY * fade;
      this.alphas[i] = fade * seed.presence * opacity;
      this.rotations[i * 2] = seed.phase + elapsedSeconds * spin * (0.5 + seed.speed * 0.5);
      this.rotations[i * 2 + 1] =
        flutter > 0
          ? Math.cos(elapsedSeconds * flutter * Math.PI * 2 * seed.speed + seed.phase * 2)
          : 1;
    });
  }
}

const fract = (value: number) => value - Math.floor(value);

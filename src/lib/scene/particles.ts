import { Color } from "three";
import type { ParticleTheme } from "@/lib/scene/seasons";

export interface ParticleBounds {
  halfWidth: number;
  halfDepth: number;
  floor: number;
  ceiling: number;
}

/** Longest simulated step; a backgrounded tab must not teleport particles on return. */
const MAX_STEP_SECONDS = 0.05;
const SPEED_SPREAD = { min: 0.7, max: 1.3 };

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

/** Flat position and colour buffers plus the motion rules for one season's particles. */
export class ParticleField {
  readonly positions: Float32Array;
  readonly colors: Float32Array;
  private speeds: Float32Array;
  private phases: Float32Array;

  constructor(
    private theme: ParticleTheme,
    private bounds: ParticleBounds,
    seed: number,
  ) {
    const random = mulberry32(seed);
    const { count } = theme;
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.speeds = new Float32Array(count);
    this.phases = new Float32Array(count);
    const palette = theme.colors.map((hex) => new Color(hex));
    for (let i = 0; i < count; i += 1) {
      this.positions[i * 3] = (random() * 2 - 1) * bounds.halfWidth;
      this.positions[i * 3 + 1] = bounds.floor + random() * (bounds.ceiling - bounds.floor);
      this.positions[i * 3 + 2] = (random() * 2 - 1) * bounds.halfDepth;
      this.speeds[i] = SPEED_SPREAD.min + random() * (SPEED_SPREAD.max - SPEED_SPREAD.min);
      this.phases[i] = random() * Math.PI * 2;
      const color = palette[Math.floor(random() * palette.length)];
      this.colors.set([color.r, color.g, color.b], i * 3);
    }
  }

  step(deltaSeconds: number, elapsedSeconds: number): void {
    const dt = Math.min(Math.max(deltaSeconds, 0), MAX_STEP_SECONDS);
    const { fall, sway, swayHz } = this.theme;
    const { floor, ceiling, halfWidth } = this.bounds;
    for (let i = 0; i < this.theme.count; i += 1) {
      const x = i * 3;
      const y = x + 1;
      this.positions[y] -= fall * this.speeds[i] * dt;
      const wobble = Math.sin(elapsedSeconds * swayHz * Math.PI * 2 + this.phases[i]);
      this.positions[x] += wobble * sway * dt;
      if (this.positions[x] > halfWidth) this.positions[x] = -halfWidth;
      if (this.positions[x] < -halfWidth) this.positions[x] = halfWidth;
      if (this.positions[y] < floor) this.positions[y] = ceiling;
      if (this.positions[y] > ceiling) this.positions[y] = floor;
    }
  }
}

import { describe, expect, it } from "vitest";
import { Color } from "three";
import { SEASON_THEMES, resolveSeason, seasonOf, type SeasonId } from "@/lib/scene/seasons";
import { ParticleField, type ParticleBounds } from "@/lib/scene/particles";

describe("seasons by date", () => {
  it.each([
    [new Date(2026, 11, 1), "winter"],
    [new Date(2027, 0, 15), "winter"],
    [new Date(2027, 1, 28), "winter"],
    [new Date(2027, 2, 1), "spring"],
    [new Date(2027, 4, 31), "spring"],
    [new Date(2027, 5, 1), "summer"],
    [new Date(2027, 7, 31), "summer"],
    [new Date(2026, 8, 1), "autumn"],
    [new Date(2026, 10, 30), "autumn"],
  ] as [Date, SeasonId][])("puts %s in %s", (date, season) => {
    expect(seasonOf(date)).toBe(season);
  });

  it("lets a preference override the calendar, e.g. for the southern hemisphere", () => {
    const july = new Date(2027, 6, 4);
    expect(resolveSeason("auto", july)).toBe("summer");
    expect(resolveSeason("winter", july)).toBe("winter");
  });
});

const channel = (hex: string) => {
  const { r, g, b } = new Color(hex);
  return { r, g, b };
};

describe("how each season looks", () => {
  it("makes winter cold and snowy", () => {
    const winter = SEASON_THEMES.winter;
    const light = channel(winter.ambient.color);
    expect(light.b).toBeGreaterThan(light.r);
    expect(winter.snowCover).toBe(true);
    expect(winter.particles.kind).toBe("snow");
    expect(winter.particles.fall).toBeGreaterThan(0);
  });

  it("makes summer bright and warm, with its own sun light", () => {
    const summer = SEASON_THEMES.summer;
    const sun = channel(summer.sun.color);
    expect(sun.r).toBeGreaterThan(sun.b);
    expect(summer.glow).not.toBeNull();
    const others = (["winter", "spring", "autumn"] as const).map((id) => SEASON_THEMES[id]);
    for (const other of others) {
      expect(summer.sun.intensity).toBeGreaterThan(other.sun.intensity);
      expect(other.glow).toBeNull();
    }
    expect(SEASON_THEMES.spring.snowCover).toBe(false);
    expect(SEASON_THEMES.autumn.snowCover).toBe(false);
  });

  it("gives every season a distinct look", () => {
    const themes = Object.values(SEASON_THEMES);
    expect(new Set(themes.map((theme) => theme.particles.kind)).size).toBe(4);
    expect(new Set(themes.map((theme) => theme.platform.top)).size).toBe(4);
    expect(new Set(themes.map((theme) => theme.css.glow)).size).toBe(4);
  });

  it("drifts autumn leaves and spring petals down, and summer motes up", () => {
    expect(SEASON_THEMES.autumn.particles.kind).toBe("leaves");
    expect(SEASON_THEMES.autumn.particles.fall).toBeGreaterThan(0);
    expect(SEASON_THEMES.spring.particles.kind).toBe("petals");
    expect(SEASON_THEMES.spring.particles.fall).toBeGreaterThan(0);
    expect(SEASON_THEMES.summer.particles.kind).toBe("motes");
    expect(SEASON_THEMES.summer.particles.fall).toBeLessThan(0);
  });
});

/** Float32 storage rounds slightly beyond the exact bound. */
const EPSILON = 1e-5;
const BOUNDS: ParticleBounds = { halfWidth: 1.5, halfDepth: 1, floor: -0.6, ceiling: 1.7 };

describe("particle field", () => {
  const winter = SEASON_THEMES.winter.particles;
  const field = (seed: number, theme = winter) => new ParticleField(theme, BOUNDS, seed);

  it("is reproducible for a seed and different for another", () => {
    expect(Array.from(field(7).positions)).toEqual(Array.from(field(7).positions));
    expect(Array.from(field(7).positions)).not.toEqual(Array.from(field(8).positions));
  });

  it("creates the configured number of particles inside the bounds", () => {
    const { positions } = field(1);
    expect(positions).toHaveLength(winter.count * 3);
    for (let i = 0; i < positions.length; i += 3) {
      expect(Math.abs(positions[i])).toBeLessThanOrEqual(BOUNDS.halfWidth + EPSILON);
      expect(positions[i + 1]).toBeGreaterThanOrEqual(BOUNDS.floor - EPSILON);
      expect(positions[i + 1]).toBeLessThanOrEqual(BOUNDS.ceiling + EPSILON);
    }
  });

  it("moves falling particles down and recycles them at the top, never leaving the volume", () => {
    const snow = field(3);
    const before = Array.from(snow.positions);
    snow.step(0.5, 0.5);
    let lower = 0;
    for (let i = 1; i < before.length; i += 3) if (snow.positions[i] < before[i]) lower += 1;
    expect(lower).toBeGreaterThan(winter.count * 0.9);
    for (let second = 1; second <= 60; second += 1) snow.step(0.25, second * 0.25);
    for (let i = 0; i < snow.positions.length; i += 3) {
      expect(snow.positions[i + 1]).toBeGreaterThanOrEqual(BOUNDS.floor - EPSILON);
      expect(snow.positions[i + 1]).toBeLessThanOrEqual(BOUNDS.ceiling + EPSILON);
    }
  });

  it("raises summer motes instead of dropping them", () => {
    const motes = field(5, SEASON_THEMES.summer.particles);
    const before = Array.from(motes.positions);
    motes.step(0.2, 0.2);
    let higher = 0;
    for (let i = 1; i < before.length; i += 3) if (motes.positions[i] > before[i]) higher += 1;
    expect(higher).toBeGreaterThan(SEASON_THEMES.summer.particles.count * 0.9);
  });

  it("ignores huge frame gaps instead of teleporting particles", () => {
    const snow = field(9);
    const before = Array.from(snow.positions);
    snow.step(30, 30);
    // Recycled particles legitimately jump to the top; everything else moved only a tick's worth.
    const drops = before.map((value, i) =>
      i % 3 === 1 && snow.positions[i] <= value ? value - snow.positions[i] : 0,
    );
    expect(Math.max(...drops)).toBeLessThan(winter.fall * 0.2);
  });
});

import { describe, expect, it } from "vitest";
import { WeatherField, type WeatherBounds } from "@/lib/scene/weather";
import { SEASON_THEMES, type SeasonId } from "@/lib/scene/seasons";

/** The volume the scene fills, centred on the plot (whose middle is at height 0.25). */
const BOUNDS: WeatherBounds = { halfWidth: 1.3, halfDepth: 1, floor: -0.85, ceiling: 1.35 };
const SEASONS = Object.keys(SEASON_THEMES) as SeasonId[];
const field = (season: SeasonId, seed = 1) =>
  new WeatherField(SEASON_THEMES[season].particles, BOUNDS, seed);
/** Float32 storage rounds slightly beyond the exact bound. */
const EPSILON = 1e-4;

describe("the weather's particles", () => {
  it("are reproducible for a seed and different for another", () => {
    const a = field("winter", 7);
    const b = field("winter", 7);
    const c = field("winter", 8);
    a.step(3);
    b.step(3);
    c.step(3);
    expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
    expect(Array.from(a.positions)).not.toEqual(Array.from(c.positions));
  });

  it.each(SEASONS)("fill the %s buffers for the configured count, in the palette", (season) => {
    const theme = SEASON_THEMES[season].particles;
    const weather = field(season);
    weather.step(0);
    expect(weather.positions).toHaveLength(theme.count * 3);
    expect(weather.colors).toHaveLength(theme.count * 3);
    expect(weather.alphas).toHaveLength(theme.count);
    expect(weather.rotations).toHaveLength(theme.count * 2);
    expect(weather.sizes).toHaveLength(theme.count);
    const sizes = Array.from(weather.sizes);
    expect(Math.min(...sizes)).toBeGreaterThan(theme.size * 0.5);
    expect(Math.max(...sizes)).toBeLessThan(theme.size * 1.6);
    expect(new Set(sizes).size).toBeGreaterThan(theme.count / 3); // not all the same
  });

  it.each(SEASONS)("never leave the volume, at any moment, in %s", (season) => {
    const theme = SEASON_THEMES[season].particles;
    const weather = field(season, 3);
    for (let time = 0; time < 400; time += 1.7) {
      weather.step(time);
      for (let i = 0; i < theme.count; i += 1) {
        expect(Math.abs(weather.positions[i * 3])).toBeLessThanOrEqual(
          BOUNDS.halfWidth + theme.sway + EPSILON,
        );
        expect(weather.positions[i * 3 + 1]).toBeGreaterThanOrEqual(BOUNDS.floor - EPSILON);
        expect(weather.positions[i * 3 + 1]).toBeLessThanOrEqual(BOUNDS.ceiling + EPSILON);
        expect(Math.abs(weather.positions[i * 3 + 2])).toBeLessThanOrEqual(
          BOUNDS.halfDepth + theme.sway + EPSILON,
        );
      }
    }
  });

  it("fall down in winter, spring and autumn, and rise in summer", () => {
    for (const season of SEASONS) {
      const theme = SEASON_THEMES[season].particles;
      const weather = field(season, 5);
      weather.step(10);
      const before = Array.from(weather.positions);
      weather.step(10.1);
      let moved = 0;
      for (let i = 0; i < theme.count; i += 1) {
        const dy = weather.positions[i * 3 + 1] - before[i * 3 + 1];
        if (Math.abs(dy) > BOUNDS.ceiling - BOUNDS.floor - 0.5) continue; // a recycled one
        moved += theme.fall > 0 ? (dy < 0 ? 1 : 0) : dy > 0 ? 1 : 0;
      }
      expect(moved, season).toBeGreaterThan(theme.count * 0.9);
    }
  });

  it.each(SEASONS)(
    "never stop dead, but fade out before they reach the end of their flight, in %s",
    (season) => {
      const theme = SEASON_THEMES[season].particles;
      const weather = field(season, 11);
      const span = BOUNDS.ceiling - BOUNDS.floor;
      const step = 0.05;
      let previous = Float32Array.from((weather.step(0), weather.positions));
      let previousAlpha = Float32Array.from(weather.alphas);
      for (let time = step; time < 120; time += step) {
        weather.step(time);
        for (let i = 0; i < theme.count; i += 1) {
          const dy = weather.positions[i * 3 + 1] - previous[i * 3 + 1];
          const wrapped = Math.abs(dy) > span / 2;
          if (wrapped) {
            // The jump from one end to the other happens while the particle cannot be seen.
            expect(previousAlpha[i], `${season} before the jump`).toBeLessThan(0.02);
            expect(weather.alphas[i], `${season} after the jump`).toBeLessThan(0.02);
          } else {
            // Every particle keeps drifting at every moment: nothing sits still on the floor.
            expect(Math.abs(dy), `${season} #${i} at ${time.toFixed(2)}`).toBeGreaterThan(1e-5);
          }
        }
        previous = Float32Array.from(weather.positions);
        previousAlpha = Float32Array.from(weather.alphas);
      }
    },
  );

  it.each(SEASONS)(
    "are invisible at both ends of their flight and plain to see between, in %s",
    (season) => {
      const strongest = SEASON_THEMES[season].particles.opacity;
      const weather = field(season, 2);
      let seen = 0;
      let hidden = 0;
      for (let time = 0; time < 200; time += 0.9) {
        weather.step(time);
        for (const alpha of weather.alphas) {
          expect(alpha).toBeGreaterThanOrEqual(0);
          expect(alpha).toBeLessThanOrEqual(strongest + 1e-6);
          if (alpha > strongest * 0.9) seen += 1;
          if (alpha < 0.02) hidden += 1;
        }
      }
      expect(seen).toBeGreaterThan(0);
      expect(hidden).toBeGreaterThan(0);
    },
  );

  it("stay calm as they fade, instead of drifting sideways at the end of their flight", () => {
    const theme = SEASON_THEMES.autumn.particles;
    const weather = field("autumn", 4);
    const lane = (time: number) => {
      weather.step(time);
      return Array.from({ length: theme.count }, (_, i) => weather.positions[i * 3]);
    };
    // Sample the sideways position of the faintest particles over a stretch of time: it hardly moves.
    let faintTravel = 0;
    let boldTravel = 0;
    let faint = 0;
    let bold = 0;
    let before = lane(0);
    let beforeAlpha = Array.from(weather.alphas);
    for (let time = 0.1; time < 60; time += 0.1) {
      const now = lane(time);
      for (let i = 0; i < theme.count; i += 1) {
        const dx = Math.abs(now[i] - before[i]);
        if (dx > 1) continue;
        if (beforeAlpha[i] < 0.1 * theme.opacity) {
          faintTravel += dx;
          faint += 1;
        } else if (beforeAlpha[i] > 0.7 * theme.opacity) {
          boldTravel += dx;
          bold += 1;
        }
      }
      before = now;
      beforeAlpha = Array.from(weather.alphas);
    }
    expect(faint).toBeGreaterThan(0);
    expect(bold).toBeGreaterThan(0);
    expect(faintTravel / faint).toBeLessThan(boldTravel / bold);
  });

  it("tumble: petals and leaves turn and flip, snow and motes do not", () => {
    const turns = (season: SeasonId) => {
      const weather = field(season, 6);
      weather.step(0);
      const before = Array.from(weather.rotations);
      weather.step(0.7);
      return before.some((value, i) => Math.abs(weather.rotations[i] - value) > 1e-3);
    };
    expect(turns("spring")).toBe(true);
    expect(turns("autumn")).toBe(true);
    expect(turns("winter")).toBe(false);
  });

  it("flip between -1 and 1, which is how face-on a petal or leaf is", () => {
    const weather = field("autumn", 6);
    for (let time = 0; time < 30; time += 0.37) {
      weather.step(time);
      for (let i = 0; i < weather.sizes.length; i += 1) {
        expect(Math.abs(weather.rotations[i * 2 + 1])).toBeLessThanOrEqual(1 + 1e-6);
      }
    }
  });

  it("draw colours only from the season's palette", () => {
    const theme = SEASON_THEMES.autumn.particles;
    const weather = field("autumn");
    weather.step(0);
    const colours = new Set<string>();
    for (let i = 0; i < theme.count; i += 1)
      colours.add(
        Array.from(weather.colors.slice(i * 3, i * 3 + 3))
          .map((v) => v.toFixed(3))
          .join(","),
      );
    expect(colours.size).toBeGreaterThan(1);
    expect(colours.size).toBeLessThanOrEqual(theme.colors.length);
  });

  describe("are subtle, and spread evenly about the middle of the picture", () => {
    // The camera's right-hand direction on the ground: where a point lands across the screen.
    const across = (x: number, z: number) => 0.8 * x - 0.6 * z;

    it.each(SEASONS)("are few and never fully opaque, in %s", (season) => {
      const theme = SEASON_THEMES[season].particles;
      expect(theme.count).toBeLessThanOrEqual(80);
      expect(theme.opacity).toBeGreaterThan(0.3);
      expect(theme.opacity).toBeLessThanOrEqual(0.8);
    });

    it.each(SEASONS)("fall evenly on both sides of the middle, in %s", (season) => {
      const theme = SEASON_THEMES[season].particles;
      const weather = field(season, 9);
      let left = 0;
      let right = 0;
      let total = 0;
      for (let time = 0; time < 300; time += 2.3) {
        weather.step(time);
        for (let i = 0; i < theme.count; i += 1) {
          if (weather.alphas[i] < 0.2) continue;
          const side = across(weather.positions[i * 3], weather.positions[i * 3 + 2]);
          if (side < 0) left += 1;
          else right += 1;
          total += side;
        }
      }
      expect(left / right).toBeGreaterThan(0.8);
      expect(left / right).toBeLessThan(1.25);
      expect(Math.abs(total / (left + right))).toBeLessThan(0.12);
    });

    it.each(SEASONS)("are centred on the plot, not above or below it, in %s", (season) => {
      const theme = SEASON_THEMES[season].particles;
      const weather = field(season, 9);
      let sum = 0;
      let count = 0;
      for (let time = 0; time < 300; time += 2.3) {
        weather.step(time);
        for (let i = 0; i < theme.count; i += 1) {
          if (weather.alphas[i] < 0.2) continue;
          sum += weather.positions[i * 3 + 1];
          count += 1;
        }
      }
      const middle = (BOUNDS.floor + BOUNDS.ceiling) / 2;
      expect(Math.abs(sum / count - middle)).toBeLessThan(0.12);
      // The volume's own middle is the plot's: 0.25, the height the camera looks at.
      expect(middle).toBeCloseTo(0.25, 6);
    });

    it.each(SEASONS)(
      "spread through every part of the volume, with no empty corners, in %s",
      (season) => {
        const theme = SEASON_THEMES[season].particles;
        const weather = field(season, 5);
        const columns = 3;
        const rows = 3;
        const cells = new Set<string>();
        for (let time = 0; time < 100; time += 3.1) {
          weather.step(time);
          for (let i = 0; i < theme.count; i += 1) {
            const x = (weather.positions[i * 3] + BOUNDS.halfWidth) / (2 * BOUNDS.halfWidth);
            const y =
              (weather.positions[i * 3 + 1] - BOUNDS.floor) / (BOUNDS.ceiling - BOUNDS.floor);
            // Sway can carry a particle a hair past an edge: it still belongs to the edge cell.
            const column = Math.max(0, Math.min(columns - 1, Math.floor(x * columns)));
            const row = Math.max(0, Math.min(rows - 1, Math.floor(y * rows)));
            cells.add(`${column},${row}`);
          }
        }
        expect(cells.size).toBe(columns * rows);
      },
    );
  });
});

import { describe, expect, it } from "vitest";
import { Color } from "three";
import { SEASON_THEMES, resolveSeason, seasonOf, type SeasonId } from "@/lib/scene/seasons";

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

  it("makes summer bright and warm", () => {
    const summer = SEASON_THEMES.summer;
    const sun = channel(summer.sun.color);
    expect(sun.r).toBeGreaterThan(sun.b);
    const others = (["winter", "spring", "autumn"] as const).map((id) => SEASON_THEMES[id]);
    for (const other of others) {
      expect(summer.sun.intensity).toBeGreaterThan(other.sun.intensity);
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

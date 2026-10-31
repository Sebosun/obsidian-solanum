import { describe, expect, it } from "vitest";
import { sunState } from "@/lib/scene/sunClock";
import { SUN_CLOCK } from "@/lib/scene/constants";

const channel = (hex: number) => ({ r: (hex >> 16) & 255, g: (hex >> 8) & 255, b: hex & 255 });
const samples = Array.from({ length: 21 }, (_, i) => i / 20);

describe("where the sun is as the session runs", () => {
  it("rises on the left horizon, peaks halfway and sets on the right", () => {
    const start = sunState(0);
    const middle = sunState(0.5);
    const end = sunState(1);
    expect(start.x).toBeCloseTo(-SUN_CLOCK.arcRadiusX, 6);
    expect(start.y).toBeCloseTo(0, 6);
    expect(middle.x).toBeCloseTo(0, 6);
    expect(middle.y).toBeCloseTo(SUN_CLOCK.arcRadiusY, 6);
    expect(end.x).toBeCloseTo(SUN_CLOCK.arcRadiusX, 6);
    expect(end.y).toBeCloseTo(0, 6);
  });

  it("moves steadily from left to right", () => {
    const xs = samples.map((p) => sunState(p).x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
  });

  it("stays on the elliptical arc at every moment", () => {
    for (const p of samples) {
      const { x, y } = sunState(p);
      expect((x / SUN_CLOCK.arcRadiusX) ** 2 + (y / SUN_CLOCK.arcRadiusY) ** 2).toBeCloseTo(1, 6);
    }
  });

  it("is at full strength at the start and only a faint ember at the end", () => {
    expect(sunState(0).brightness).toBe(1);
    expect(sunState(1).brightness).toBeCloseTo(SUN_CLOCK.endBrightness, 6);
    expect(SUN_CLOCK.endBrightness).toBeLessThan(0.15);
  });

  it("dims, shrinks and darkens the world the closer it gets to the end", () => {
    const states = samples.map(sunState);
    for (let i = 1; i < states.length; i += 1) {
      expect(states[i].brightness).toBeLessThan(states[i - 1].brightness);
      expect(states[i].scale).toBeLessThan(states[i - 1].scale);
      expect(states[i].lightFactor).toBeLessThan(states[i - 1].lightFactor);
      expect(states[i].ambientFactor).toBeLessThan(states[i - 1].ambientFactor);
      expect(states[i].dusk).toBeGreaterThan(states[i - 1].dusk);
    }
    expect(states[0].dusk).toBe(0);
    expect(states[20].dusk).toBeLessThanOrEqual(1);
  });

  it("warms from pale gold towards orange as it sets", () => {
    const dawn = channel(sunState(0).color);
    const dusk = channel(sunState(1).color);
    expect(dusk.b).toBeLessThan(dawn.b);
    expect(dusk.g).toBeLessThan(dawn.g);
    expect(dusk.r).toBeGreaterThanOrEqual(dawn.r - 1);
  });

  it("clamps progress outside the session", () => {
    expect(sunState(-0.5)).toEqual(sunState(0));
    expect(sunState(3)).toEqual(sunState(1));
    expect(sunState(Number.NaN)).toEqual(sunState(0));
  });

  it("lights the scene from where the sun is, and from higher when it is high", () => {
    expect(sunState(0.5).lightPosition[1]).toBeGreaterThan(sunState(0).lightPosition[1]);
    expect(sunState(0).lightPosition[0]).toBeLessThan(sunState(1).lightPosition[0]);
  });
});

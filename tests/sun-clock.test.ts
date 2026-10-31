import { describe, expect, it } from "vitest";
import { sunState } from "@/lib/scene/sunClock";
import { SUN_CLOCK } from "@/lib/scene/constants";

const channel = (css: string) => {
  const hex = Number.parseInt(css.slice(1), 16);
  return { r: (hex >> 16) & 255, g: (hex >> 8) & 255, b: hex & 255 };
};
const samples = Array.from({ length: 21 }, (_, i) => i / 20);

describe("where the sun shines from as the session runs", () => {
  it("rises on the left, peaks halfway and sets on the right, as high as it rose", () => {
    const [startX, startY] = sunState(0).lightPosition;
    const [middleX, middleY] = sunState(0.5).lightPosition;
    const [endX, endY] = sunState(1).lightPosition;
    expect(startX).toBeLessThan(0);
    expect(middleX).toBeCloseTo(0, 6);
    expect(endX).toBeGreaterThan(0);
    expect(endX).toBeCloseTo(-startX, 6);
    expect(middleY).toBeGreaterThan(startY);
    expect(endY).toBeCloseTo(startY, 6);
  });

  it("moves steadily from left to right, rising to the middle and sinking after it", () => {
    const xs = samples.map((p) => sunState(p).lightPosition[0]);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    const ys = samples.map((p) => sunState(p).lightPosition[1]);
    const peak = ys.indexOf(Math.max(...ys));
    expect(peak).toBe(10);
  });

  it("is at full strength at the start and only a faint ember at the end", () => {
    expect(sunState(0).lightFactor).toBe(1);
    expect(sunState(1).lightFactor).toBeCloseTo(SUN_CLOCK.endLight, 6);
    expect(SUN_CLOCK.endLight).toBeLessThan(0.15);
  });

  it("dims the lights and darkens the sky the closer it gets to the end", () => {
    const states = samples.map(sunState);
    for (let i = 1; i < states.length; i += 1) {
      expect(states[i].lightFactor).toBeLessThan(states[i - 1].lightFactor);
      expect(states[i].ambientFactor).toBeLessThan(states[i - 1].ambientFactor);
      expect(states[i].dusk).toBeGreaterThan(states[i - 1].dusk);
    }
    expect(states[0].dusk).toBe(0);
    expect(states[20].dusk).toBeLessThanOrEqual(1);
  });

  it("warms from pale gold towards orange as it sets", () => {
    const dawn = channel(sunState(0).colorCss);
    const dusk = channel(sunState(1).colorCss);
    expect(dusk.b).toBeLessThan(dawn.b);
    expect(dusk.g).toBeLessThan(dawn.g);
    expect(dusk.r).toBeGreaterThanOrEqual(dawn.r - 1);
  });

  it("clamps progress outside the session", () => {
    expect(sunState(-0.5)).toEqual(sunState(0));
    expect(sunState(3)).toEqual(sunState(1));
    expect(sunState(Number.NaN)).toEqual(sunState(0));
  });

  it("lights the scene from higher when the sun is high", () => {
    expect(sunState(0.5).lightPosition[1]).toBeGreaterThan(sunState(0).lightPosition[1]);
    expect(sunState(0).lightPosition[0]).toBeLessThan(sunState(1).lightPosition[0]);
  });
});

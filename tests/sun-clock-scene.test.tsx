import { describe, expect, it, vi } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import type { Vector3 } from "three";
import { SeasonScenery } from "@/components/stage/SeasonScenery";
import { SEASON_THEMES } from "@/lib/scene/seasons";
import { sunState } from "@/lib/scene/sunClock";

// These tests isolate the moving lights; the real model and its lifecycle are covered in scenery.
vi.mock("@/components/models/FarmPlatform", () => ({ FarmPlatform: () => null }));

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
const named = (renderer: Renderer, name: string) => renderer.scene.findByProps({ name }).instance;

describe("light that follows the sun", () => {
  async function lights(daylight?: ReturnType<typeof sunState>) {
    const renderer = await ReactThreeTestRenderer.create(
      <SeasonScenery season="summer" animate={false} daylight={daylight} />,
    );
    const sun = named(renderer, "season-sun") as unknown as {
      intensity: number;
      position: Vector3;
      color: { getHexString(): string };
    };
    const ambient = named(renderer, "season-ambient") as unknown as { intensity: number };
    const result = {
      sun: sun.intensity,
      x: sun.position.x,
      ambient: ambient.intensity,
      colour: sun.color.getHexString(),
    };
    await renderer.unmount();
    return result;
  }

  it("keeps the season's own light when there is no clock", async () => {
    const plain = await lights();
    expect(plain.sun).toBe(SEASON_THEMES.summer.sun.intensity);
    expect(plain.ambient).toBe(SEASON_THEMES.summer.ambient.intensity);
  });

  it("dims and moves the light with the sun", async () => {
    const dawn = await lights(sunState(0));
    const dusk = await lights(sunState(1));
    expect(dawn.sun).toBeCloseTo(SEASON_THEMES.summer.sun.intensity, 6);
    expect(dusk.sun).toBeLessThan(dawn.sun * 0.2);
    expect(dusk.ambient).toBeLessThan(dawn.ambient * 0.5);
    expect(dawn.x).toBeLessThan(dusk.x);
    expect(dusk.colour).not.toBe(dawn.colour);
  });
});

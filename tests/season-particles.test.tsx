import { describe, expect, it } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { Points, ShaderMaterial } from "three";
import { SeasonParticles } from "@/components/stage/SeasonParticles";
import { SEASON_THEMES, type SeasonId } from "@/lib/scene/seasons";

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
const mount = (season: SeasonId, animate = true) =>
  ReactThreeTestRenderer.create(
    <SeasonParticles theme={SEASON_THEMES[season]} animate={animate} />,
  );
const points = (renderer: Renderer) => {
  const found = renderer.scene.findByProps({ name: "season-particles" }).instance;
  if (!(found instanceof Points)) throw new Error("season-particles is not Points");
  return found;
};
const array = (renderer: Renderer, name: string) =>
  Array.from(points(renderer).geometry.getAttribute(name).array as Float32Array);
const frames = (renderer: Renderer, count: number, delta = 0.05) =>
  ReactThreeTestRenderer.act(async () => {
    await renderer.advanceFrames(count, delta);
  });

describe("the season's weather in the scene", () => {
  it.each(["winter", "spring", "summer", "autumn"] as const)(
    "draws one sprite per particle with every attribute its shader reads, in %s",
    async (season) => {
      const renderer = await mount(season);
      const geometry = points(renderer).geometry;
      const count = SEASON_THEMES[season].particles.count;
      expect(geometry.getAttribute("position").count).toBe(count);
      expect(geometry.getAttribute("aColor").count).toBe(count);
      expect(geometry.getAttribute("aAlpha").count).toBe(count);
      expect(geometry.getAttribute("aRotation").count).toBe(count);
      expect(geometry.getAttribute("aSize").count).toBe(count);
      expect(points(renderer).material).toBeInstanceOf(ShaderMaterial);
      await renderer.unmount();
    },
  );

  it("moves, fades and tumbles frame by frame", async () => {
    const renderer = await mount("autumn");
    const before = {
      position: array(renderer, "position"),
      alpha: array(renderer, "aAlpha"),
      rotation: array(renderer, "aRotation"),
    };
    await frames(renderer, 12);
    expect(array(renderer, "position")).not.toEqual(before.position);
    expect(array(renderer, "aAlpha")).not.toEqual(before.alpha);
    expect(array(renderer, "aRotation")).not.toEqual(before.rotation);
    await renderer.unmount();
  });

  it("falls in winter and rises in summer", async () => {
    const direction = async (season: SeasonId) => {
      const renderer = await mount(season);
      const before = array(renderer, "position");
      await frames(renderer, 4);
      const after = array(renderer, "position");
      let down = 0;
      let up = 0;
      for (let i = 1; i < before.length; i += 3) {
        if (Math.abs(after[i] - before[i]) > 2) continue;
        if (after[i] < before[i]) down += 1;
        else up += 1;
      }
      await renderer.unmount();
      return { down, up };
    };
    const winter = await direction("winter");
    const summer = await direction("summer");
    expect(winter.down).toBeGreaterThan(winter.up * 5);
    expect(summer.up).toBeGreaterThan(summer.down * 5);
  });

  it("keeps the clock for its twinkling moving, and the clock still when motion is off", async () => {
    const moving = await mount("summer");
    const time = () => (points(moving).material as ShaderMaterial).uniforms.uTime.value as number;
    await frames(moving, 3);
    const first = time();
    await frames(moving, 5);
    expect(time()).toBeGreaterThan(first);
    await moving.unmount();

    const still = await mount("summer", false);
    const before = array(still, "position");
    await frames(still, 10);
    expect(array(still, "position")).toEqual(before);
    expect((points(still).material as ShaderMaterial).uniforms.uTime.value).toBe(0);
    await still.unmount();
  });

  it("does not leap forward when a frame stalls", async () => {
    const renderer = await mount("winter");
    const before = array(renderer, "position");
    await frames(renderer, 1, 30);
    const after = array(renderer, "position");
    let farthest = 0;
    for (let i = 1; i < before.length; i += 3) {
      const move = Math.abs(after[i] - before[i]);
      if (move < 2) farthest = Math.max(farthest, move);
    }
    expect(farthest).toBeLessThan(SEASON_THEMES.winter.particles.fall * 0.3);
    await renderer.unmount();
  });

  it("sizes its sprites in pixels from how big a world unit is on screen", async () => {
    const renderer = await mount("winter");
    await frames(renderer, 2);
    expect(
      (points(renderer).material as ShaderMaterial).uniforms.uPixelsPerUnit.value,
    ).toBeGreaterThan(0);
    await renderer.unmount();
  });
});

import { describe, expect, it } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import {
  AmbientLight,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  Points,
  type Object3D,
} from "three";
import { SeasonScenery } from "@/components/stage/SeasonScenery";
import { SEASON_THEMES, type SeasonId } from "@/lib/scene/seasons";

async function mount(season: SeasonId, animate = true) {
  return ReactThreeTestRenderer.create(<SeasonScenery season={season} animate={animate} />);
}
function node(renderer: Awaited<ReturnType<typeof mount>>, name: string): Object3D {
  return renderer.scene.findByProps({ name }).instance;
}
function positionsOf(renderer: Awaited<ReturnType<typeof mount>>) {
  const points = node(renderer, "season-particles");
  if (!(points instanceof Points)) throw new Error("season-particles is not Points");
  const { array, count } = points.geometry.getAttribute("position");
  if (!(array instanceof Float32Array)) throw new Error("positions are not a Float32Array");
  return { array, count };
}
function expectInstance<T>(value: unknown, type: abstract new (...args: never[]) => T): T {
  if (!(value instanceof type)) throw new Error(`Expected a ${type.name}`);
  return value;
}
const names = (renderer: Awaited<ReturnType<typeof mount>>) =>
  renderer.scene.findAll(() => true).map((node) => node.instance.name);

describe("seasonal scenery in the real scene graph", () => {
  it("lights the scene with the season's palette", async () => {
    for (const season of Object.keys(SEASON_THEMES) as SeasonId[]) {
      const renderer = await mount(season);
      const ambient = expectInstance(node(renderer, "season-ambient"), AmbientLight);
      const sun = expectInstance(node(renderer, "season-sun"), DirectionalLight);
      expect(`#${ambient.color.getHexString()}`).toBe(SEASON_THEMES[season].ambient.color);
      expect(sun.intensity).toBe(SEASON_THEMES[season].sun.intensity);
      await renderer.unmount();
    }
  });

  it("adds a visible sun and its warm light only in summer", async () => {
    const summer = await mount("summer");
    expect(names(summer)).toEqual(expect.arrayContaining(["season-glow-light", "season-halo"]));
    await summer.unmount();
    for (const season of ["winter", "spring", "autumn"] as const) {
      const other = await mount(season);
      expect(names(other)).not.toContain("season-glow-light");
      expect(names(other)).not.toContain("season-halo");
      await other.unmount();
    }
  });

  it("covers the platform in snow only in winter", async () => {
    const winter = await mount("winter");
    expect(names(winter)).toContain("snow-cover");
    await winter.unmount();
    const summer = await mount("summer");
    expect(names(summer)).not.toContain("snow-cover");
    const top = expectInstance(node(summer, "platform-top"), Mesh);
    const material = expectInstance(top.material, MeshStandardMaterial);
    expect(`#${material.color.getHexString()}`).toBe(SEASON_THEMES.summer.platform.top);
    await summer.unmount();
  });

  it("animates falling snow frame by frame and keeps it in the volume", async () => {
    const renderer = await mount("winter");
    const positions = positionsOf(renderer);
    expect(positions.count).toBe(SEASON_THEMES.winter.particles.count);
    const before = Array.from(positions.array);
    await renderer.advanceFrames(10, 0.05);
    const after = Array.from(positions.array);
    expect(after).not.toEqual(before);
    let lower = 0;
    for (let i = 1; i < before.length; i += 3) if (after[i] < before[i]) lower += 1;
    expect(lower).toBeGreaterThan(positions.count * 0.8);
    await renderer.unmount();
  });

  it("holds particles still when motion is off but still draws them", async () => {
    const renderer = await mount("autumn", false);
    const before = Array.from(positionsOf(renderer).array);
    await renderer.advanceFrames(10, 0.05);
    expect(Array.from(positionsOf(renderer).array)).toEqual(before);
    expect(before.length).toBe(SEASON_THEMES.autumn.particles.count * 3);
    await renderer.unmount();
  });
});

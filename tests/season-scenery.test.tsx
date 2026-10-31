import { beforeAll, describe, expect, it, vi } from "vitest";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { assetReader, loadAsset } from "./helpers/glb";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import {
  AmbientLight,
  DirectionalLight,
  Mesh,
  MeshBasicMaterial,
  Points,
  type Object3D,
} from "three";
import { SeasonScenery } from "@/components/stage/SeasonScenery";
import { SEASON_THEMES, type SeasonId } from "@/lib/scene/seasons";
import { floorAtCentre, prepareBaked } from "@/lib/models/baked";
import { CropAssets } from "@/lib/crops/CropAssets";
import { sunState } from "@/lib/scene/sunClock";

const platform = vi.hoisted(() => ({ model: null as GLTF | null }));
vi.mock("@/hooks/useModel", () => ({
  useModel: (path: string) => {
    if (path !== "stage/Farm_platform.glb" || !platform.model)
      throw new Error(`Unexpected platform asset: ${path}`);
    return platform.model;
  },
}));

beforeAll(async () => {
  platform.model = await loadAsset("stage/Farm_platform.glb");
});

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

  it("draws no sun in any season: it is only the light", async () => {
    for (const season of Object.keys(SEASON_THEMES) as SeasonId[]) {
      const renderer = await mount(season);
      expect(names(renderer)).not.toContain("season-glow-light");
      expect(names(renderer)).not.toContain("season-halo");
      expect(renderer.scene.findAll((node) => node.instance.type === "PointLight")).toHaveLength(0);
      await renderer.unmount();
    }
  });

  it("covers the platform in snow only in winter", async () => {
    const winter = await mount("winter");
    expect(names(winter)).toContain("snow-cover");
    await winter.unmount();
    const summer = await mount("summer");
    expect(names(summer)).not.toContain("snow-cover");
    const model = node(summer, "farm-platform").getObjectByProperty("type", "Mesh");
    const top = expectInstance<Mesh>(model, Mesh);
    const material = expectInstance(top.material, MeshBasicMaterial);
    expect(material.toneMapped).toBe(false);
    expect(material.vertexColors).toBe(true);
    expect(names(summer)).not.toContain("platform-rim");
    expect(names(summer)).not.toContain("platform-top");
    await summer.unmount();
  });

  it("keeps the authored planting surface at zero instead of grounding the underside", () => {
    if (!platform.model) throw new Error("Platform was not loaded");
    const prepared = prepareBaked(platform.model.scene, { size: { width: 1.9 }, grounded: false });
    expect(floorAtCentre(prepared.object)).toBeCloseTo(0, 6);
  });

  it("lands the planted crop on the new surface, and disposes only its cloned materials", async () => {
    if (!platform.model) throw new Error("Platform was not loaded");
    const source = expectInstance<Mesh>(
      platform.model.scene.getObjectByProperty("type", "Mesh"),
      Mesh,
    );
    const original = expectInstance(source.material, MeshBasicMaterial);
    const sharedDispose = vi.spyOn(original, "dispose");
    const geometryDispose = vi.spyOn(source.geometry, "dispose");
    const renderer = await mount("summer");
    const group = node(renderer, "farm-platform");
    const copy = expectInstance<Mesh>(group.getObjectByProperty("type", "Mesh"), Mesh);
    const owned = expectInstance(copy.material, MeshBasicMaterial);
    const ownedDispose = vi.spyOn(owned, "dispose");
    expect(floorAtCentre(group)).toBeCloseTo(-0.54, 6);
    expect(owned).not.toBe(original);
    expect(copy.geometry).toBe(source.geometry);
    await renderer.unmount();
    expect(ownedDispose).toHaveBeenCalledOnce();
    expect(sharedDispose).not.toHaveBeenCalled();
    expect(geometryDispose).not.toHaveBeenCalled();
  });

  it("reads the shipped GLB once through the shared vault-binary repository", async () => {
    const read = vi.fn(assetReader);
    const repository = new CropAssets(read);
    const first = repository.loadModel("stage/Farm_platform.glb");
    expect(repository.loadModel("stage/Farm_platform.glb")).toBe(first);
    const model = await first;
    const mesh = expectInstance<Mesh>(model.scene.getObjectByProperty("type", "Mesh"), Mesh);
    expect(mesh.geometry.getAttribute("position").count / 3).toBeLessThan(200);
    expect(mesh.geometry.getAttribute("color")).toBeDefined();
    expect(model.cameras).toHaveLength(0);
    expect(model.scene.children).toHaveLength(1);
    expect(read).toHaveBeenCalledExactlyOnceWith("stage/Farm_platform.glb");
  });

  it("dims only the platform's private baked materials as the sun fades", async () => {
    const daylight = { current: sunState(0) };
    const renderer = await ReactThreeTestRenderer.create(
      <SeasonScenery season="summer" animate={false} daylightRef={daylight} />,
    );
    const copy = expectInstance<Mesh>(
      node(renderer, "farm-platform").getObjectByProperty("type", "Mesh"),
      Mesh,
    );
    const material = expectInstance(copy.material, MeshBasicMaterial);
    await renderer.advanceFrames(1, 0.05);
    expect(material.color.r).toBeCloseTo(1, 6);
    daylight.current = sunState(1);
    await renderer.advanceFrames(1, 0.05);
    expect(material.color.r).toBeLessThan(0.6);
    expect(material.toneMapped).toBe(false);
    await renderer.unmount();
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

import { statSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { Box3, Mesh, MeshBasicMaterial, Vector3, type Object3D } from "three";
import { CoffeeMug } from "@/components/scene/CoffeeMug";
import { BREAK_SCENE } from "@/lib/scene/constants";
import { prepareMug } from "@/lib/scene/mug";
import { sunState } from "@/lib/scene/sunClock";
import { MUG_FILE, loadMug } from "./helpers/catModel";

const model = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/hooks/useBreakModel", () => ({ useBreakModel: () => model.current }));

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
const group = (renderer: Renderer): Object3D =>
  renderer.scene.findByProps({ name: "coffee-mug" }).instance;
const materialsOf = (root: Object3D) => {
  const found = new Set<MeshBasicMaterial>();
  root.traverse((node) => {
    if (node instanceof Mesh && node.material instanceof MeshBasicMaterial)
      found.add(node.material);
  });
  return [...found];
};
const frames = (renderer: Renderer, count: number) =>
  ReactThreeTestRenderer.act(async () => {
    await renderer.advanceFrames(count, 0.05);
  });

describe("the shipped mug", () => {
  it("stays small, sits on its own axis and is baked, so it does not need the scene's light", async () => {
    expect(statSync(MUG_FILE).size).toBeLessThan(1_000_000);
    const { scene } = await loadMug();
    const box = new Box3().setFromObject(scene);
    expect(box.min.y).toBeLessThan(0.01);
    expect(box.getSize(new Vector3()).y).toBeGreaterThan(0.05);
    expect(box.min.x).toBeLessThan(0);
    expect(box.max.x).toBeGreaterThan(0);
    const materials = materialsOf(scene);
    expect(materials).toHaveLength(1);
    expect(materials[0].map).not.toBeNull();
  });
});

describe("preparing the mug for the scene", () => {
  it("makes it as tall as asked and stands it on the ground", async () => {
    const { scene } = await loadMug();
    const { object, factor } = prepareMug(scene, 0.24);
    const box = new Box3().setFromObject(object);
    expect(box.min.y).toBeCloseTo(0, 6);
    expect(box.getSize(new Vector3()).y * factor).toBeCloseTo(0.24, 6);
  });

  it("gives its copy private materials, leaving the shared model untouched", async () => {
    const { scene } = await loadMug();
    const prepared = prepareMug(scene, 0.24);
    expect(prepared.materials).toHaveLength(1);
    const [original] = materialsOf(scene);
    expect(prepared.materials[0]).not.toBe(original);
    prepared.materials[0].color.setScalar(0.1);
    expect(original.color.r).toBe(1);
  });
});

describe("the mug in the scene", () => {
  it("stands where the scene says, as tall as it says, with steam over the coffee", async () => {
    model.current = await loadMug();
    const renderer = await ReactThreeTestRenderer.create(<CoffeeMug reduced={false} />);
    const placed = group(renderer);
    expect(placed.position.toArray()).toEqual([
      BREAK_SCENE.mug.position[0],
      BREAK_SCENE.groundY,
      BREAK_SCENE.mug.position[1],
    ]);
    const mugBox = new Box3().setFromObject(placed.children[0]);
    expect(mugBox.getSize(new Vector3()).y).toBeCloseTo(BREAK_SCENE.mug.height, 4);
    const steam = renderer.scene.findByProps({ name: "steam" }).instance;
    const start = new Vector3();
    steam.getWorldPosition(start);
    expect(start.y - BREAK_SCENE.groundY).toBeCloseTo(
      BREAK_SCENE.mug.height * BREAK_SCENE.mug.coffeeLevel,
      4,
    );
    await renderer.unmount();
  });

  it("dims with the light but never goes dark", async () => {
    model.current = await loadMug();
    const daylight = { current: sunState(0) };
    const renderer = await ReactThreeTestRenderer.create(
      <CoffeeMug reduced={false} daylightRef={daylight} />,
    );
    const brightness = () => materialsOf(group(renderer))[0].color.r;
    await frames(renderer, 2);
    const day = brightness();
    daylight.current = sunState(1);
    await frames(renderer, 2);
    expect(brightness()).toBeLessThan(day);
    expect(brightness()).toBeGreaterThan(0.3);
    await renderer.unmount();
  });
});

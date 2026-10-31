import { describe, expect, it, vi } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { Box3, Mesh, MeshBasicMaterial, Vector3, type Object3D } from "three";
import { Pillow } from "@/components/models/Pillow";
import { BREAK_SCENE } from "@/lib/scene/constants";
import { sunState } from "@/lib/scene/sunClock";
import { loadPillow } from "./helpers/catModel";

const model = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/hooks/useBreakModel", () => ({ useBreakModel: () => model.current }));

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
const find = (renderer: Renderer, name: string): Object3D =>
  renderer.scene.findByProps({ name }).instance;
const frames = (renderer: Renderer, count: number) =>
  ReactThreeTestRenderer.act(async () => {
    await renderer.advanceFrames(count, 0.05);
  });
const materialsOf = (root: Object3D) => {
  const found = new Set<MeshBasicMaterial>();
  root.traverse((node) => {
    if (node instanceof Mesh && node.material instanceof MeshBasicMaterial)
      found.add(node.material);
  });
  return [...found];
};

describe("the pillow in the scene", () => {
  it("is as wide as the scene says, sitting at the base height, where and how turned it says", async () => {
    model.current = await loadPillow();
    const renderer = await ReactThreeTestRenderer.create(<Pillow />);
    const pillow = find(renderer, "pillow");
    const { position, turn, width } = BREAK_SCENE.pillow;
    expect(pillow.position.toArray()).toEqual([position[0], BREAK_SCENE.groundY, position[1]]);
    expect(pillow.rotation.y).toBeCloseTo(turn, 6);
    const box = new Box3().setFromObject(pillow.children[0]);
    expect(box.getSize(new Vector3()).x).toBeCloseTo(width, 4);
    expect(box.min.y).toBeCloseTo(0, 4);
    await renderer.unmount();
  });

  it("lays whatever rests on it on the floor of its dish, not on its rim or on the ground", async () => {
    model.current = await loadPillow();
    const renderer = await ReactThreeTestRenderer.create(
      <Pillow>
        <mesh name="sleeper" />
      </Pillow>,
    );
    const floor = find(renderer, "pillow-floor");
    const top = new Box3().setFromObject(find(renderer, "pillow").children[0]).max.y;
    expect(floor.position.y).toBeGreaterThan(0.05);
    expect(floor.position.y).toBeLessThan(top);
    expect(floor.getObjectByName("sleeper")).toBeDefined();
    await renderer.unmount();
  });

  it("keeps its baked colours out of tone mapping and dims, but not to black, as the light fades", async () => {
    model.current = await loadPillow();
    const daylight = { current: sunState(0) };
    const renderer = await ReactThreeTestRenderer.create(<Pillow daylightRef={daylight} />);
    const [material] = materialsOf(find(renderer, "pillow"));
    expect(material.toneMapped).toBe(false);
    await frames(renderer, 2);
    const day = material.color.r;
    daylight.current = sunState(1);
    await frames(renderer, 2);
    expect(material.color.r).toBeLessThan(day);
    expect(material.color.r).toBeGreaterThan(0.3);
    await renderer.unmount();
  });
});

describe("where the break's parts stand on the screen", () => {
  // The camera looks from the +X, +Z side, so its right-hand direction on the ground is this one.
  const right = new Vector3(0.8, 0, -0.6);
  const onScreen = (position: readonly [number, number]) =>
    new Vector3(position[0], 0, position[1]).dot(right);

  it("has the cat's pillow on the left and the mug on the right", () => {
    expect(onScreen(BREAK_SCENE.pillow.position)).toBeLessThan(0);
    expect(onScreen(BREAK_SCENE.mug.position)).toBeGreaterThan(0);
    expect(
      onScreen(BREAK_SCENE.mug.position) - onScreen(BREAK_SCENE.pillow.position),
    ).toBeGreaterThan(BREAK_SCENE.pillow.width / 2);
  });

  it("keeps all of it inside what the camera frames", () => {
    const { min, max } = BREAK_SCENE.bounds;
    for (const [x, z] of [BREAK_SCENE.pillow.position, BREAK_SCENE.mug.position]) {
      expect(x).toBeGreaterThan(min[0]);
      expect(x).toBeLessThan(max[0]);
      expect(z).toBeGreaterThan(min[2]);
      expect(z).toBeLessThan(max[2]);
    }
  });
});

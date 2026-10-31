import { describe, expect, it, vi } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import type { Object3D } from "three";
import { SleepingCat } from "@/components/models/SleepingCat";
import { BREAK_SCENE } from "@/lib/scene/constants";
import { loadCat } from "./helpers/catModel";

const model = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/hooks/useCatModel", () => ({ useCatModel: () => model.current }));

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
const group = (renderer: Renderer): Object3D =>
  renderer.scene.findByProps({ name: "sleeping-cat" }).instance;
/** The model's own parts are not React nodes, so they are found through the cat's group. */
const find = (renderer: Renderer, name: string): Object3D =>
  group(renderer).getObjectByName(name) as Object3D;
const frames = (renderer: Renderer, count: number, delta = 0.1) =>
  ReactThreeTestRenderer.act(async () => {
    await renderer.advanceFrames(count, delta);
  });

describe("the sleeping cat in the scene", () => {
  it("breathes: the body swells and settles as the animation plays", async () => {
    model.current = await loadCat();
    const renderer = await ReactThreeTestRenderer.create(<SleepingCat reduced={false} />);
    const body = find(renderer, "Body");
    const heights: number[] = [];
    for (let i = 0; i < 40; i += 1) {
      await frames(renderer, 1, 0.1);
      heights.push(body.scale.y);
    }
    expect(Math.max(...heights)).toBeGreaterThan(1.02);
    expect(Math.min(...heights)).toBeLessThan(1.005);
    await renderer.unmount();
  });

  it("holds its pose under reduced motion", async () => {
    model.current = await loadCat();
    const renderer = await ReactThreeTestRenderer.create(<SleepingCat reduced />);
    const body = find(renderer, "Body");
    const head = find(renderer, "Head");
    const before = [body.scale.y, head.position.y];
    await frames(renderer, 30, 0.1);
    expect([body.scale.y, head.position.y]).toEqual(before);
    await renderer.unmount();
  });

  it("does not leap through the breath when a frame stalls", async () => {
    model.current = await loadCat();
    const renderer = await ReactThreeTestRenderer.create(<SleepingCat reduced={false} />);
    const body = find(renderer, "Body");
    await frames(renderer, 1, 30); // half a minute in one frame
    // It moved on by at most a tenth of a second, so it is still near the start of the loop.
    expect(body.scale.y).toBeCloseTo(1, 1);
    await renderer.unmount();
  });

  it("is sized and turned from the scene's own settings, without altering the shared model", async () => {
    const loaded = await loadCat();
    model.current = loaded;
    const renderer = await ReactThreeTestRenderer.create(<SleepingCat reduced={false} />);
    const placed = group(renderer);
    expect(placed.scale.x).toBeCloseTo(BREAK_SCENE.cat.scale, 6);
    expect(placed.position.y).toBeCloseTo(-BREAK_SCENE.cat.sink, 6);
    expect(placed.rotation.y).toBeCloseTo(BREAK_SCENE.cat.turn, 6);
    await frames(renderer, 10, 0.2);
    // The clone animates; the loaded scene it came from stays at rest.
    expect(loaded.scene.getObjectByName("Body")!.scale.y).toBe(1);
    await renderer.unmount();
  });
});

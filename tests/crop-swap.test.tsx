import { describe, expect, it } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import type { Object3D } from "three";
import { CropSwap } from "@/components/stage/CropSwap";
import type { CropId } from "@/lib/crops/catalog";

function scene(crop: CropId, reduced = false) {
  return (
    <CropSwap crop={crop} reduced={reduced}>
      {(planted) => <mesh name={`crop-${planted}`} />}
    </CropSwap>
  );
}
type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
const names = (renderer: Renderer) =>
  renderer.scene
    .findAll((node) => node.instance.name.startsWith("crop-swap-"))
    .map((node) => node.instance.name)
    .sort();
const swapGroup = (renderer: Renderer, crop: CropId): Object3D =>
  renderer.scene.findByProps({ name: `crop-swap-${crop}` }).instance;
const FRAME = 0.05;
/** State set inside a frame callback only commits under act in the test renderer. */
const frames = (renderer: Renderer, count: number) =>
  ReactThreeTestRenderer.act(async () => {
    await renderer.advanceFrames(count, FRAME);
  });

describe("swapping the planted crop in the scene", () => {
  it("shows the first crop immediately, without an entrance", async () => {
    const renderer = await ReactThreeTestRenderer.create(scene("tomato"));
    expect(names(renderer)).toEqual(["crop-swap-tomato"]);
    expect(swapGroup(renderer, "tomato").scale.x).toBe(1);
    await renderer.unmount();
  });

  it("shrinks the old crop while the new one grows in, then keeps only the new one", async () => {
    const renderer = await ReactThreeTestRenderer.create(scene("tomato"));
    await renderer.update(scene("carrot"));
    expect(names(renderer)).toEqual(["crop-swap-carrot", "crop-swap-tomato"]);
    expect(swapGroup(renderer, "tomato").scale.x).toBe(1);
    expect(swapGroup(renderer, "carrot").scale.x).toBeLessThan(0.05);

    await frames(renderer, 4);
    expect(swapGroup(renderer, "tomato").scale.x).toBeLessThan(1);
    expect(swapGroup(renderer, "tomato").scale.x).toBeGreaterThan(0);
    expect(swapGroup(renderer, "carrot").scale.x).toBeGreaterThan(0.1);
    expect(swapGroup(renderer, "tomato").rotation.y).not.toBe(0);

    await frames(renderer, 20);
    expect(names(renderer)).toEqual(["crop-swap-carrot"]);
    expect(swapGroup(renderer, "carrot").scale.x).toBe(1);
    expect(swapGroup(renderer, "carrot").rotation.y).toBe(0);
    await renderer.unmount();
  });

  it("handles quick successive changes without keeping stale crops around", async () => {
    const renderer = await ReactThreeTestRenderer.create(scene("tomato"));
    await renderer.update(scene("carrot"));
    await frames(renderer, 2);
    await renderer.update(scene("corn"));
    await frames(renderer, 30);
    expect(names(renderer)).toEqual(["crop-swap-corn"]);
    await renderer.unmount();
  });

  it("switches instantly under reduced motion", async () => {
    const renderer = await ReactThreeTestRenderer.create(scene("tomato", true));
    await renderer.update(scene("pumpkin", true));
    expect(names(renderer)).toEqual(["crop-swap-pumpkin"]);
    expect(swapGroup(renderer, "pumpkin").scale.x).toBe(1);
    await renderer.unmount();
  });
});

import { beforeAll, describe, expect, it, vi } from "vitest";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { loadAsset } from "./helpers/glb";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { Box3, Mesh, MeshBasicMaterial, type Object3D } from "three";
import { HarvestBlockMesh, plantSize } from "@/components/models/HarvestBlockMesh";
import { blockHeight, layoutHarvestBlocks } from "@/lib/harvest/month";
import { focusSession } from "./helpers/sessions";
import type { Revision } from "@/lib/timer/types";

const platform = vi.hoisted(() => ({ model: null as GLTF | null }));
vi.mock("@/hooks/useModel", () => ({
  useModel: (path: string) => {
    if (path !== "stage/Farm_platform.glb" || !platform.model) throw new Error("Unexpected model");
    return platform.model;
  },
}));
beforeAll(async () => {
  platform.model = await loadAsset("stage/Farm_platform.glb");
});

vi.mock("@/components/models/Plant", () => ({
  Plant: ({ crop, scale }: { crop: string; scale: number }) => (
    <mesh name={`plant-${crop}`} scale={scale} />
  ),
}));

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
const OCTOBER = new Date(2026, 9, 1);
const NOW = new Date(2026, 10, 1).getTime();
const at = (day: number, hour = 9) => new Date(2026, 9, day, hour);

function mount(sessions: Revision[], reduced = true, now = NOW) {
  const layout = layoutHarvestBlocks(sessions, OCTOBER, {}, now);
  const element = (
    <>
      {layout.blocks.map((block, index) => (
        <HarvestBlockMesh key={block.key} block={block} index={index} reduced={reduced} />
      ))}
    </>
  );
  return { layout, element };
}
const named = (renderer: Renderer, name: string): Object3D =>
  renderer.scene.findByProps({ name }).instance;
const meshOf = (group: Object3D): Mesh => {
  const found = group.getObjectByProperty("type", "Mesh");
  if (!(found instanceof Mesh)) throw new Error("Platform is not a mesh");
  return found;
};
const frames = (renderer: Renderer, count: number) =>
  ReactThreeTestRenderer.act(async () => {
    await renderer.advanceFrames(count, 0.05);
  });

describe("a block for each harvest", () => {
  const sessions = [
    focusSession("short", at(2), 25),
    focusSession("long", at(3), 90, { crop: "pumpkin" }),
    focusSession("carrots", at(4), 50, { crop: "carrot" }),
  ];

  it("identifies the pointed or tapped harvest and clears it on pointer out", async () => {
    const { layout } = mount(sessions);
    const onInspect = vi.fn();
    const renderer = await ReactThreeTestRenderer.create(
      <HarvestBlockMesh block={layout.blocks[0]} index={0} reduced onInspect={onInspect} />,
    );
    const group = renderer.scene.findByProps({ name: "block-short" });
    const stopPropagation = vi.fn();
    await renderer.fireEvent(group, "pointerOver", { stopPropagation });
    expect(onInspect).toHaveBeenLastCalledWith("short");
    await renderer.fireEvent(group, "pointerOut", { stopPropagation });
    expect(onInspect).toHaveBeenLastCalledWith(null);
    await renderer.fireEvent(group, "click", { stopPropagation });
    expect(onInspect).toHaveBeenLastCalledWith("short");
    expect(stopPropagation).toHaveBeenCalledTimes(3);
    await renderer.unmount();
  });

  it("uses the same farm platform, with earth as tall as the session and produce on its soil", async () => {
    const { layout, element } = mount(sessions);
    const renderer = await ReactThreeTestRenderer.create(element);
    for (const block of layout.blocks) {
      const group = named(renderer, `block-${block.sessionId}`);
      const plot = group.getObjectByName("farm-platform");
      if (!plot) throw new Error("Shared farm platform is missing");
      plot.updateWorldMatrix(true, true);
      expect(plot.position.y).toBeCloseTo(blockHeight(block.minutes) + 0.07, 6);
      expect(new Box3().setFromObject(plot).min.y).toBeCloseTo(0, 6);
      expect(group.getObjectByName("block-body")).toBeUndefined();
      expect(group.getObjectByName("block-top")).toBeUndefined();
      expect([group.position.x, group.position.z]).toEqual([block.position[0], block.position[2]]);
      expect(group.getObjectByName(`plant-${block.crop}`)).toBeDefined();
    }
    const heights = layout.blocks.map((block) => block.height);
    expect(heights[1]).toBeGreaterThan(heights[2]);
    expect(heights[2]).toBeGreaterThan(heights[0]);
    await renderer.unmount();
  });

  it("sizes plants by session length, smaller while still growing", async () => {
    const start = at(5).getTime();
    const growing = focusSession("grow", new Date(start), 40, {
      phase: "focus",
      status: "running",
      focusEndedAt: null,
      deadline: start + 40 * 60_000,
      intervals: [{ start, end: null }],
    });
    const { element } = mount([...sessions, growing], true, start + 10 * 60_000);
    const renderer = await ReactThreeTestRenderer.create(element);
    const size = (id: string) =>
      named(renderer, `block-${id}`).getObjectByName("plant-tomato")!.scale.x;
    expect(size("grow")).toBeLessThan(size("short"));
    expect(plantSize(90, 1)).toBeGreaterThan(plantSize(25, 1));
    expect(plantSize(25, 0.25)).toBeLessThan(plantSize(25, 1));
    await renderer.unmount();
  });

  it("preserves the baked colours and rim proportions, and never edits shared model geometry", async () => {
    if (!platform.model) throw new Error("Missing source model");
    const source = meshOf(platform.model.scene);
    const originalPositions = Array.from(source.geometry.getAttribute("position").array);
    const sharedDispose = vi.spyOn(source.geometry, "dispose");
    const { layout, element } = mount(sessions);
    const renderer = await ReactThreeTestRenderer.create(element);
    const rimHeights: number[] = [];
    const dispose = [];
    for (const block of layout.blocks) {
      const plot = named(renderer, `block-${block.sessionId}`).getObjectByName("farm-platform");
      if (!plot) throw new Error("Missing plot");
      const mesh = meshOf(plot);
      expect(mesh.geometry).not.toBe(source.geometry);
      if (!(mesh.material instanceof MeshBasicMaterial))
        throw new Error("Platform must stay unlit");
      expect(mesh.material.toneMapped).toBe(false);
      expect(mesh.material.vertexColors).toBe(true);
      plot.updateWorldMatrix(true, true);
      rimHeights.push(new Box3().setFromObject(plot).max.y - plot.position.y);
      dispose.push(vi.spyOn(mesh.geometry, "dispose"));
    }
    expect(Math.max(...rimHeights) - Math.min(...rimHeights)).toBeLessThan(0.00001);
    await renderer.unmount();
    expect(Array.from(source.geometry.getAttribute("position").array)).toEqual(originalPositions);
    expect(sharedDispose).not.toHaveBeenCalled();
    for (const owned of dispose) expect(owned).toHaveBeenCalledOnce();
  });

  it("rises one after another, then stands still", async () => {
    const many = Array.from({ length: 12 }, (_, i) => focusSession(`m${i}`, at(1 + i, 9), 25));
    const { element } = mount(many, false);
    const renderer = await ReactThreeTestRenderer.create(element);
    const heightOf = (id: string) => named(renderer, `block-${id}`).children[0].scale.y;
    expect(heightOf("m0")).toBeLessThan(0.01);
    await frames(renderer, 2);
    expect(heightOf("m0")).toBeGreaterThan(0.3);
    expect(heightOf("m11")).toBeLessThan(0.05);
    await frames(renderer, 30);
    expect([heightOf("m0"), heightOf("m11")]).toEqual([1, 1]);
    await renderer.unmount();
  });
});

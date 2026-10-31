import { describe, expect, it, vi } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { BoxGeometry, Mesh, MeshStandardMaterial, type Object3D } from "three";
import { HarvestBlockMesh, plantSize } from "@/components/harvest/HarvestBlockMesh";
import { blockHeight, layoutHarvestBlocks } from "@/lib/harvest/month";
import { SEASON_THEMES, type SeasonId } from "@/lib/scene/seasons";
import { focusSession } from "./helpers/sessions";
import type { Revision } from "@/lib/timer/types";

vi.mock("@/components/scene/Plant", () => ({
  Plant: ({ crop, scale }: { crop: string; scale: number }) => (
    <mesh name={`plant-${crop}`} scale={scale} />
  ),
}));

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
const OCTOBER = new Date(2026, 9, 1);
const NOW = new Date(2026, 10, 1).getTime();
const at = (day: number, hour = 9) => new Date(2026, 9, day, hour);

function mount(sessions: Revision[], season: SeasonId = "autumn", reduced = true, now = NOW) {
  const layout = layoutHarvestBlocks(sessions, OCTOBER, {}, now);
  const element = (
    <>
      {layout.blocks.map((block, index) => (
        <HarvestBlockMesh
          key={block.key}
          block={block}
          index={index}
          season={season}
          reduced={reduced}
        />
      ))}
    </>
  );
  return { layout, element };
}
const named = (renderer: Renderer, name: string): Object3D =>
  renderer.scene.findByProps({ name }).instance;
const meshOf = (group: Object3D, name: string): Mesh => {
  const found = group.getObjectByName(name);
  if (!(found instanceof Mesh)) throw new Error(`${name} is not a mesh`);
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

  it("stands each block as tall as its session, with the crop growing on top", async () => {
    const { layout, element } = mount(sessions);
    const renderer = await ReactThreeTestRenderer.create(element);
    for (const block of layout.blocks) {
      const group = named(renderer, `block-${block.sessionId}`);
      const body = meshOf(group, "block-body");
      expect(body.geometry).toBeInstanceOf(BoxGeometry);
      expect((body.geometry as BoxGeometry).parameters.height).toBeCloseTo(
        blockHeight(block.minutes),
        6,
      );
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
    const { element } = mount([...sessions, growing], "autumn", true, start + 10 * 60_000);
    const renderer = await ReactThreeTestRenderer.create(element);
    const size = (id: string) =>
      named(renderer, `block-${id}`).getObjectByName("plant-tomato")!.scale.x;
    expect(size("grow")).toBeLessThan(size("short"));
    expect(plantSize(90, 1)).toBeGreaterThan(plantSize(25, 1));
    expect(plantSize(25, 0.25)).toBeLessThan(plantSize(25, 1));
    await renderer.unmount();
  });

  it("dusts the blocks with snow in winter and warms them in summer", async () => {
    async function colours(season: SeasonId) {
      const { element } = mount([sessions[0]], season);
      const renderer = await ReactThreeTestRenderer.create(element);
      const group = named(renderer, "block-short");
      const material = (name: string) => {
        const m = meshOf(group, name).material;
        if (!(m instanceof MeshStandardMaterial)) throw new Error("unexpected material");
        return m.color;
      };
      const body = material("block-body");
      const top = `#${material("block-top").getHexString()}`;
      await renderer.unmount();
      return { brightness: (body.r + body.g + body.b) / 3, blue: body.b > body.r, top };
    }
    const winter = await colours("winter");
    const summer = await colours("summer");
    expect(winter.brightness).toBeGreaterThan(summer.brightness + 0.1);
    expect(winter.blue).toBe(true);
    expect(winter.top).toBe(SEASON_THEMES.winter.platform.top);
    expect(summer.top).toBe(SEASON_THEMES.summer.platform.top);
  });

  it("rises one after another, then stands still", async () => {
    const many = Array.from({ length: 12 }, (_, i) => focusSession(`m${i}`, at(1 + i, 9), 25));
    const { element } = mount(many, "autumn", false);
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

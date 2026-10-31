import { describe, expect, it, vi } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import type { Object3D } from "three";
import { YearStackMesh } from "@/components/harvest/YearStackMesh";
import { layoutYearStacks, type YearMonth, type YearStack } from "@/lib/harvest/year";
import { YEAR_STACKS } from "@/lib/scene/constants";
import { stackHeight, stackPosition } from "@/lib/scene/yearLayout";

vi.mock("@react-three/drei", () => ({ Html: () => null }));
vi.mock("@/components/scene/Plant", () => ({
  Plant: ({ crop, scale }: { crop: string; scale: number }) => (
    <mesh name={`plant-${crop}`} scale={scale} />
  ),
}));

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
const HOUR = 60;
function months(hours: number[]): YearMonth[] {
  return hours.map((value, index) => ({
    index,
    date: new Date(2026, index, 1),
    minutes: value * HOUR,
    harvests: value > 0 ? 1 : 0,
    activeDays: 0,
    crops: { tomato: 3, carrot: 1, corn: 0, pumpkin: 0, coconut: 0 },
    tags: [],
  }));
}
const layout = layoutYearStacks(months([0, 15, 60, 29]));
const stack = (index: number): YearStack => layout.stacks[index];

function mount(over: Partial<Parameters<typeof YearStackMesh>[0]> = {}) {
  const onActivate = vi.fn();
  const onOpen = vi.fn();
  const element = (
    <YearStackMesh
      stack={stack(2)}
      label="Mar"
      hours={60}
      active={false}
      reduced
      onActivate={onActivate}
      onOpen={onOpen}
      {...over}
    />
  );
  return { element, onActivate, onOpen };
}
const named = (renderer: Renderer, name: string): Object3D =>
  renderer.scene.findByProps({ name }).instance;
const crates = (renderer: Renderer) =>
  renderer.scene.findAll((node) => node.instance.name === "crate");
const frames = (renderer: Renderer, count: number) =>
  ReactThreeTestRenderer.act(async () => {
    await renderer.advanceFrames(count, 0.05);
  });

describe("a month's stack in the scene", () => {
  it("stacks one crate per block of hours, each above the last", async () => {
    const { element } = mount();
    const renderer = await ReactThreeTestRenderer.create(element);
    const found = crates(renderer);
    expect(found).toHaveLength(stack(2).crates);
    expect(found).toHaveLength(YEAR_STACKS.maxCrates);
    const heights = found.map((node) => node.instance.position.y).sort((a, b) => a - b);
    heights.forEach((y, level) => expect(y).toBeCloseTo(level * YEAR_STACKS.crateStep, 6));
    await renderer.unmount();
  });

  it("makes a busier month a taller stack than a quieter one", async () => {
    const tall = await ReactThreeTestRenderer.create(mount({ stack: stack(2) }).element);
    const short = await ReactThreeTestRenderer.create(
      mount({ stack: stack(1), label: "Feb" }).element,
    );
    expect(crates(tall).length).toBeGreaterThan(crates(short).length);
    expect(stackHeight(stack(2))).toBeGreaterThan(stackHeight(stack(1)));
    await tall.unmount();
    await short.unmount();
  });

  it("grows the month's crops on the top crate only, as many as the leftover time earns", async () => {
    const { element } = mount({ stack: stack(1), label: "Feb", hours: 15 });
    const renderer = await ReactThreeTestRenderer.create(element);
    const plants = renderer.scene.findAll((node) => node.instance.name.startsWith("plant-"));
    expect(plants).toHaveLength(stack(1).plants.length);
    const topFloor = (stack(1).crates - 1) * YEAR_STACKS.crateStep;
    for (const plant of plants) {
      const stand = plant.instance.parent!;
      expect(stand.position.y).toBeGreaterThan(topFloor);
      expect(stand.position.y).toBeLessThan(topFloor + YEAR_STACKS.crateHeight);
      expect(Math.abs(stand.position.x)).toBeLessThan(YEAR_STACKS.crateWidth / 2);
      expect(Math.abs(stand.position.z)).toBeLessThan(YEAR_STACKS.crateDepth / 2);
    }
    expect(new Set(plants.map((p) => p.instance.parent!.position.toArray().join())).size).toBe(
      plants.length,
    );
    await renderer.unmount();
  });

  it("leaves a month with nothing finished as one bare, low crate", async () => {
    const { element } = mount({ stack: stack(0), label: "Jan", hours: null });
    const renderer = await ReactThreeTestRenderer.create(element);
    expect(crates(renderer)).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.instance.name.startsWith("plant-"))).toHaveLength(
      0,
    );
    const side = crates(renderer)[0].instance.children[1] as unknown as {
      geometry: { parameters: { height: number } };
    };
    expect(side.geometry.parameters.height).toBeCloseTo(YEAR_STACKS.emptyCrateHeight, 6);
    await renderer.unmount();
  });

  it("sits in its place in the grid", async () => {
    const { element } = mount({ stack: stack(3), label: "Apr" });
    const renderer = await ReactThreeTestRenderer.create(element);
    const group = named(renderer, "stack-3");
    const [x, , z] = stackPosition(3);
    expect([group.position.x, group.position.z]).toEqual([x, z]);
    await renderer.unmount();
  });

  it("reports hover and click for its own month, and lifts while active", async () => {
    const { element, onActivate, onOpen } = mount();
    const renderer = await ReactThreeTestRenderer.create(element);
    const stopPropagation = vi.fn();
    const group = renderer.scene.findByProps({ name: "stack-2" });
    await renderer.fireEvent(group, "pointerOver", { stopPropagation });
    expect(onActivate).toHaveBeenLastCalledWith(2);
    await renderer.fireEvent(group, "click", { stopPropagation });
    expect(onOpen).toHaveBeenCalledWith(2);
    await renderer.fireEvent(group, "pointerOut", { stopPropagation });
    expect(onActivate).toHaveBeenLastCalledWith(null);
    expect(stopPropagation).toHaveBeenCalledTimes(3);
    const resting = group.instance.position.y;
    await renderer.update(mount({ active: true }).element);
    expect(renderer.scene.findByProps({ name: "stack-2" }).instance.position.y).toBeGreaterThan(
      resting,
    );
    await renderer.unmount();
  });

  it("rises into place a beat after the earlier months, then stands still", async () => {
    const first = mount({ stack: stack(0), label: "Jan", hours: null, reduced: false });
    const later = mount({ stack: { ...stack(2), index: 9 }, label: "Oct", reduced: false });
    const renderer = await ReactThreeTestRenderer.create(
      <>
        {first.element}
        {later.element}
      </>,
    );
    const scaleOf = (index: number) => named(renderer, `stack-${index}`).children[0].scale.x;
    expect(scaleOf(0)).toBeLessThan(0.01);
    await frames(renderer, 2);
    expect(scaleOf(0)).toBeGreaterThan(0.3);
    expect(scaleOf(9)).toBeLessThan(0.05);
    await frames(renderer, 30);
    expect([scaleOf(0), scaleOf(9)]).toEqual([1, 1]);
    await renderer.unmount();
  });
});

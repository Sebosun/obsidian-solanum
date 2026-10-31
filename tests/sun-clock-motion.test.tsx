import { describe, expect, it } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { Mesh, MeshBasicMaterial, type Object3D } from "three";
import { ClockDigits } from "@/components/scene/ClockDigits";
import { useSunProgress } from "@/hooks/useSunProgress";
import { clockAdvance, createCountdownGeometry, layoutClock } from "@/lib/scene/clockGeometry";
import { SUN_CLOCK } from "@/lib/scene/constants";

const FRAME = 1 / 60;
type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
const run = (renderer: Renderer, frames: number) =>
  ReactThreeTestRenderer.act(async () => {
    await renderer.advanceFrames(frames, FRAME);
  });

type SunRef = ReturnType<typeof useSunProgress>;
interface Holder {
  sun: SunRef | null;
}
function Probe({
  target,
  rate,
  reduced,
  holder,
}: {
  target: number;
  rate: number;
  reduced: boolean;
  holder: Holder;
}) {
  holder.sun = useSunProgress(target, rate, reduced);
  return null;
}
const probe = (target: number, rate: number, reduced: boolean, holder: Holder) => (
  <Probe target={target} rate={rate} reduced={reduced} holder={holder} />
);
/** The sun's progress after each of `frames` single frames. */
async function sample(renderer: Renderer, holder: Holder, frames: number): Promise<number[]> {
  const values: number[] = [];
  for (let i = 0; i < frames; i += 1) {
    await run(renderer, 1);
    values.push(holder.sun!.current.progress);
  }
  return values;
}

describe("a sun that keeps moving between clock ticks", () => {
  it("advances a little every frame instead of once a second", async () => {
    const holder: Holder = { sun: null };
    const rate = 1 / 100; // a 100 second phase
    const renderer = await ReactThreeTestRenderer.create(probe(0.2, rate, false, holder));
    const seen = await sample(renderer, holder, 60);
    const steps = seen.slice(1).map((value, i) => value - seen[i]);
    expect(steps.filter((step) => step <= 0)).toEqual([]);
    // After the first moments of catching up, every frame moves the sun by the same small amount.
    const steady = steps.slice(30);
    const mean = steady.reduce((a, b) => a + b, 0) / steady.length;
    expect(mean).toBeCloseTo(rate * FRAME, 5);
    expect(Math.max(...steady)).toBeLessThan(mean * 1.1);
    expect(Math.min(...steady)).toBeGreaterThan(mean * 0.9);
    expect(seen[seen.length - 1]).toBeCloseTo(0.2 + rate - rate / SUN_CLOCK.smoothing, 3);
    await renderer.unmount();
  });

  it("follows each tick of the clock without jumping", async () => {
    const holder: Holder = { sun: null };
    const rate = 1 / 100;
    const renderer = await ReactThreeTestRenderer.create(probe(0.2, rate, false, holder));
    const first = await sample(renderer, holder, 60);
    const before = first[first.length - 1];
    await renderer.update(probe(0.2 + rate * 1.02, rate, false, holder)); // the tick lands a hair late
    const after = await sample(renderer, holder, 2);
    expect(Math.abs(after[after.length - 1] - before)).toBeLessThan(rate * 0.2);
    await renderer.unmount();
  });

  it("settles on the target and stays there when paused", async () => {
    const holder: Holder = { sun: null };
    const renderer = await ReactThreeTestRenderer.create(probe(0.3, 0, false, holder));
    await renderer.update(probe(0.35, 0, false, holder));
    const settled = await sample(renderer, holder, 120);
    expect(settled[settled.length - 1]).toBeCloseTo(0.35, 3);
    const later = await sample(renderer, holder, 60);
    expect(later[later.length - 1]).toBeCloseTo(0.35, 3);
    await renderer.unmount();
  });

  it("glides to a new phase's dawn instead of snapping back", async () => {
    const holder: Holder = { sun: null };
    const renderer = await ReactThreeTestRenderer.create(probe(0.98, 0, false, holder));
    await renderer.update(probe(0, 0, false, holder));
    const early = await sample(renderer, holder, 3);
    expect(early[early.length - 1]).toBeGreaterThan(0.5);
    const rest = await sample(renderer, holder, 180);
    expect(rest[rest.length - 1]).toBeLessThan(0.01);
    expect(rest.every((value, i) => i === 0 || value <= rest[i - 1])).toBe(true);
    await renderer.unmount();
  });

  it("never passes the end of the arc", async () => {
    const holder: Holder = { sun: null };
    const renderer = await ReactThreeTestRenderer.create(probe(0.99, 0.5, false, holder));
    const seen = await sample(renderer, holder, 240);
    expect(Math.max(...seen)).toBeLessThanOrEqual(1);
    await renderer.unmount();
  });

  it("just shows the target under reduced motion", async () => {
    const holder: Holder = { sun: null };
    const renderer = await ReactThreeTestRenderer.create(probe(0.4, 0.5, true, holder));
    expect(new Set(await sample(renderer, holder, 30))).toEqual(new Set([0.4]));
    await renderer.update(probe(0.45, 0.5, true, holder));
    const after = await sample(renderer, holder, 1);
    expect(after[0]).toBe(0.45);
    await renderer.unmount();
  });
});

describe("laying out the digits one by one", () => {
  it("places the characters left to right, centred, by the font's own widths", () => {
    const positions = layoutClock("25:00", 1);
    expect(positions).toHaveLength(5);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    const total = ["2", "5", ":", "0", "0"].reduce((sum, c) => sum + clockAdvance(c, 1), 0);
    expect(positions[0]).toBeCloseTo(-total / 2, 6);
    expect(positions[1] - positions[0]).toBeCloseTo(clockAdvance("2", 1), 6);
    expect(positions[3] - positions[2]).toBeCloseTo(clockAdvance(":", 1), 6);
  });

  it("is as wide as the whole string set at once", () => {
    const size = 1.1;
    const whole = createCountdownGeometry(25 * 60_000, size);
    whole.computeBoundingBox();
    const wholeWidth = whole.boundingBox!.max.x - whole.boundingBox!.min.x;
    const positions = layoutClock("25:00", size);
    const end = positions[4] + clockAdvance("0", size);
    expect(end - positions[0]).toBeGreaterThan(wholeWidth * 0.97);
    expect(end - positions[0]).toBeLessThan(wholeWidth * 1.12);
  });
});

describe("the digits rolling over", () => {
  const digits = (text: string) => (
    <ClockDigits text={text} size={1.1} color="#d8d0bf" opacity={0.3} reduced={false} />
  );
  const visible = (renderer: Renderer, prefix: string) =>
    renderer.scene.findAll((node) => node.instance.name.startsWith(prefix));
  const material = (node: Object3D) => {
    if (!(node instanceof Mesh) || !(node.material instanceof MeshBasicMaterial))
      throw new Error("digit is not a basic mesh");
    return node.material;
  };

  it("shows one glyph per character, at full strength", async () => {
    const renderer = await ReactThreeTestRenderer.create(digits("25:00"));
    const current = renderer.scene.findAll((node) => /^clock-digit-\d+$/.test(node.instance.name));
    expect(
      current.filter((node) => !node.instance.name.startsWith("clock-digit-out")),
    ).toHaveLength(5);
    for (const node of current) expect(material(node.instance).opacity).toBeCloseTo(0.3, 6);
    await renderer.unmount();
  });

  it("rolls only the characters that changed, old one down and out, new one in from above", async () => {
    const renderer = await ReactThreeTestRenderer.create(digits("18:23"));
    await renderer.update(digits("18:22"));
    expect(visible(renderer, "clock-digit-out-")).toHaveLength(1);
    const outgoing = renderer.scene.findByProps({ name: "clock-digit-out-4" }).instance;
    const incoming = renderer.scene.findByProps({ name: "clock-digit-4" }).instance;
    const restY = renderer.scene.findByProps({ name: "clock-digit-0" }).instance.position.y;
    expect(material(incoming).opacity).toBeLessThan(0.05);
    expect(material(outgoing).opacity).toBeCloseTo(0.3, 1);
    expect(incoming.position.y).toBeGreaterThan(restY);

    await run(renderer, 12);
    expect(material(outgoing).opacity).toBeLessThan(0.3);
    expect(outgoing.position.y).toBeLessThan(restY);
    expect(material(incoming).opacity).toBeGreaterThan(0.05);
    expect(incoming.position.y).toBeLessThan(SUN_CLOCK.digitRoll.travel);
    expect(incoming.position.y).toBeGreaterThan(restY);

    await run(renderer, 60);
    expect(visible(renderer, "clock-digit-out-")).toHaveLength(0);
    expect(
      material(renderer.scene.findByProps({ name: "clock-digit-4" }).instance).opacity,
    ).toBeCloseTo(0.3, 6);
    expect(renderer.scene.findByProps({ name: "clock-digit-4" }).instance.position.y).toBeCloseTo(
      restY,
      6,
    );
    await renderer.unmount();
  });

  it("leaves unchanged characters completely still", async () => {
    const renderer = await ReactThreeTestRenderer.create(digits("18:23"));
    const before = renderer.scene
      .findByProps({ name: "clock-digit-0" })
      .instance.position.toArray();
    await renderer.update(digits("18:22"));
    await run(renderer, 6);
    const node = renderer.scene.findByProps({ name: "clock-digit-0" }).instance;
    expect(node.position.toArray()).toEqual(before);
    expect(material(node).opacity).toBeCloseTo(0.3, 6);
    expect(visible(renderer, "clock-digit-out-0")).toHaveLength(0);
    await renderer.unmount();
  });

  it("rolls every digit when the whole time changes, such as a new phase", async () => {
    const renderer = await ReactThreeTestRenderer.create(digits("00:01"));
    await renderer.update(digits("59:30"));
    expect(visible(renderer, "clock-digit-out-")).toHaveLength(4);
    await run(renderer, 60);
    expect(visible(renderer, "clock-digit-out-")).toHaveLength(0);
    await renderer.unmount();
  });

  it("changes instantly under reduced motion", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <ClockDigits text="18:23" size={1.1} color="#fff" opacity={0.3} reduced />,
    );
    await renderer.update(
      <ClockDigits text="18:22" size={1.1} color="#fff" opacity={0.3} reduced />,
    );
    expect(visible(renderer, "clock-digit-out-")).toHaveLength(0);
    expect(
      material(renderer.scene.findByProps({ name: "clock-digit-4" }).instance).opacity,
    ).toBeCloseTo(0.3, 6);
    await renderer.unmount();
  });

  it("keeps the digit size a little smaller than before", () => {
    expect(SUN_CLOCK.digitSize).toBeLessThan(1.35);
    expect(SUN_CLOCK.digitSize).toBeGreaterThan(0.8);
  });
});

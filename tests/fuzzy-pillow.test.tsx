import { describe, expect, it } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import type { Object3D, ShaderMaterial } from "three";
import { FuzzyPillow } from "@/components/scene/FuzzyPillow";
import { BREAK_SCENE } from "@/lib/scene/constants";
import { createFuzzShared, createFuzzShell } from "@/lib/scene/fuzz";
import { sunState } from "@/lib/scene/sunClock";

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
const shells = (renderer: Renderer) =>
  renderer.scene
    .findAll((node) => node.instance.name === "pillow-fur")
    .map((node) => node.instance as Object3D & { material: ShaderMaterial });
const frames = (renderer: Renderer, count: number) =>
  ReactThreeTestRenderer.act(async () => {
    await renderer.advanceFrames(count, 0.05);
  });

describe("the fuzzy pillow", () => {
  it("wraps a cushion in layers of fur, each one reaching a bit further out", async () => {
    const renderer = await ReactThreeTestRenderer.create(<FuzzyPillow />);
    const layers = shells(renderer).map((shell) => shell.material.uniforms.uLayer.value as number);
    expect(layers.length).toBeGreaterThan(10);
    expect([...layers].sort((a, b) => a - b)).toEqual(layers);
    expect(layers[layers.length - 1]).toBeCloseTo(1, 6);
    expect(layers[0]).toBeGreaterThan(0);
    await renderer.unmount();
  });

  it("sits on the platform where the scene says, turned as it says", async () => {
    const renderer = await ReactThreeTestRenderer.create(<FuzzyPillow />);
    const group = renderer.scene.findByProps({ name: "fuzzy-pillow" }).instance;
    expect(group.position.toArray()).toEqual([
      BREAK_SCENE.pillow.position[0],
      BREAK_SCENE.groundY,
      BREAK_SCENE.pillow.position[1],
    ]);
    expect(group.rotation.y).toBeCloseTo(BREAK_SCENE.pillow.turn, 6);
    await renderer.unmount();
  });

  it("dims, but never to black, as the light fades", async () => {
    const daylight = { current: sunState(0) };
    const renderer = await ReactThreeTestRenderer.create(<FuzzyPillow daylightRef={daylight} />);
    const brightness = () => shells(renderer)[0].material.uniforms.uBrightness.value as number;
    await frames(renderer, 2);
    const day = brightness();
    daylight.current = sunState(1);
    await frames(renderer, 2);
    expect(brightness()).toBeLessThan(day);
    expect(brightness()).toBeGreaterThan(0.3);
    await renderer.unmount();
  });

  it("shares one brightness between all its layers", () => {
    const shared = createFuzzShared();
    const options = { root: "#fff", tip: "#fff", density: 40, length: 0.05 };
    const a = createFuzzShell(0.2, shared, options);
    const b = createFuzzShell(0.9, shared, options);
    shared.uBrightness.value = 0.4;
    expect(a.uniforms.uBrightness.value).toBe(0.4);
    expect(b.uniforms.uBrightness.value).toBe(0.4);
    expect(a.uniforms.uLayer.value).not.toBe(b.uniforms.uLayer.value);
  });
});

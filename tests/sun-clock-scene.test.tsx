import { describe, expect, it } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { Mesh, MeshBasicMaterial, Vector3, type Object3D } from "three";
import { SunClock } from "@/components/scene/SunClock";
import { SeasonScenery } from "@/components/scene/SeasonScenery";
import { createCountdownGeometry } from "@/lib/scene/clockGeometry";
import { SEASON_THEMES } from "@/lib/scene/seasons";
import { SUN_CLOCK } from "@/lib/scene/constants";
import { sunClockPlacement, sunState } from "@/lib/scene/sunClock";

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
const MINUTE = 60_000;
const named = (renderer: Renderer, name: string): Object3D =>
  renderer.scene.findByProps({ name }).instance;
const layers = (renderer: Renderer) =>
  renderer.scene
    .findAll((node) => node.instance.name === "clock-sun-layer")
    .map((node) => {
      const mesh = node.instance;
      if (!(mesh instanceof Mesh) || !(mesh.material instanceof MeshBasicMaterial))
        throw new Error("sun layer is not a basic mesh");
      return mesh.material;
    });
const clock = (progress: number, remaining = 25 * MINUTE) => (
  <SunClock progress={progress} remaining={remaining} color="#d8d0bf" />
);

describe("the sun clock in the scene", () => {
  it("hangs behind the plot, facing the camera", async () => {
    const renderer = await ReactThreeTestRenderer.create(clock(0));
    const group = named(renderer, "sun-clock");
    const placement = sunClockPlacement();
    expect(group.position.toArray()).toEqual(placement.position);
    expect(group.quaternion.angleTo(placement.quaternion)).toBeCloseTo(0, 6);
    await renderer.unmount();
  });

  it("puts the sun where the progress says, and moves it as time passes", async () => {
    const renderer = await ReactThreeTestRenderer.create(clock(0));
    const position = () => named(renderer, "clock-sun").position.clone();
    expect(position().x).toBeCloseTo(sunState(0).x, 6);
    await renderer.update(clock(0.5));
    expect(position().x).toBeCloseTo(0, 6);
    expect(position().y).toBeCloseTo(SUN_CLOCK.arcRadiusY, 6);
    await renderer.update(clock(1));
    expect(position().x).toBeCloseTo(SUN_CLOCK.arcRadiusX, 6);
    await renderer.unmount();
  });

  it("dims, shrinks and reddens the sun the closer it is to the end", async () => {
    const renderer = await ReactThreeTestRenderer.create(clock(0));
    const early = {
      opacity: layers(renderer).map((material) => material.opacity),
      scale: named(renderer, "clock-sun").scale.x,
      blue: layers(renderer)[0].color.b,
    };
    await renderer.update(clock(0.95));
    const late = {
      opacity: layers(renderer).map((material) => material.opacity),
      scale: named(renderer, "clock-sun").scale.x,
      blue: layers(renderer)[0].color.b,
    };
    early.opacity.forEach((value, i) => expect(late.opacity[i]).toBeLessThan(value * 0.25));
    expect(late.scale).toBeLessThan(early.scale);
    expect(late.blue).toBeLessThan(early.blue);
    expect(early.opacity[0]).toBeCloseTo(SUN_CLOCK.sunLayers[0].opacity, 6);
    await renderer.unmount();
  });

  it("shows the time in large faint digits that fit inside the arc and fade a little", async () => {
    const renderer = await ReactThreeTestRenderer.create(clock(0, 25 * MINUTE));
    const digits = () => {
      const mesh = named(renderer, "clock-digits");
      if (!(mesh instanceof Mesh) || !(mesh.material instanceof MeshBasicMaterial))
        throw new Error("digits are not a basic mesh");
      mesh.geometry.computeBoundingBox();
      return {
        width: mesh.geometry.boundingBox!.getSize(new Vector3()).x,
        opacity: mesh.material.opacity,
        mesh,
      };
    };
    const first = digits();
    const expected = createCountdownGeometry(25 * MINUTE, SUN_CLOCK.digitSize);
    expected.computeBoundingBox();
    expect(first.width).toBeCloseTo(expected.boundingBox!.getSize(new Vector3()).x, 6);
    expect(first.width).toBeGreaterThan(SUN_CLOCK.arcRadiusX); // big, not a caption
    expect(first.width).toBeLessThan(2 * SUN_CLOCK.arcRadiusX); // and inside the arc
    expect(first.opacity).toBeGreaterThan(0.2);
    expect(first.opacity).toBeLessThan(0.5);
    await renderer.update(clock(0.9, 2 * MINUTE + 30_000));
    const later = digits();
    expect(later.opacity).toBeLessThan(first.opacity);
    expect(later.mesh.geometry.attributes.position.count).not.toBe(
      first.mesh.geometry.attributes.position.count + 0.5,
    );
    await renderer.unmount();
  });

  it("changes the digits when the time changes", async () => {
    const renderer = await ReactThreeTestRenderer.create(clock(0, 25 * MINUTE));
    const vertices = () => {
      const mesh = named(renderer, "clock-digits");
      if (!(mesh instanceof Mesh)) throw new Error("digits are not a mesh");
      return Array.from(mesh.geometry.attributes.position.array);
    };
    const before = vertices();
    await renderer.update(clock(0.2, 20 * MINUTE));
    expect(vertices()).not.toEqual(before);
    await renderer.unmount();
  });
});

describe("light that follows the sun", () => {
  async function lights(daylight?: ReturnType<typeof sunState>) {
    const renderer = await ReactThreeTestRenderer.create(
      <SeasonScenery season="summer" animate={false} daylight={daylight} />,
    );
    const sun = named(renderer, "season-sun") as unknown as {
      intensity: number;
      position: Vector3;
      color: { getHexString(): string };
    };
    const ambient = named(renderer, "season-ambient") as unknown as { intensity: number };
    const hasGlow =
      renderer.scene.findAll((node) => node.instance.name === "season-glow-light").length > 0;
    const result = {
      sun: sun.intensity,
      x: sun.position.x,
      ambient: ambient.intensity,
      colour: sun.color.getHexString(),
      hasGlow,
    };
    await renderer.unmount();
    return result;
  }

  it("keeps the season's own light when there is no clock", async () => {
    const plain = await lights();
    expect(plain.sun).toBe(SEASON_THEMES.summer.sun.intensity);
    expect(plain.ambient).toBe(SEASON_THEMES.summer.ambient.intensity);
    expect(plain.hasGlow).toBe(true);
  });

  it("dims and moves the light with the sun, and drops the fixed sun halo", async () => {
    const dawn = await lights(sunState(0));
    const dusk = await lights(sunState(1));
    expect(dawn.sun).toBeCloseTo(SEASON_THEMES.summer.sun.intensity, 6);
    expect(dusk.sun).toBeLessThan(dawn.sun * 0.2);
    expect(dusk.ambient).toBeLessThan(dawn.ambient * 0.5);
    expect(dawn.x).toBeLessThan(dusk.x);
    expect(dusk.colour).not.toBe(dawn.colour);
    expect(dawn.hasGlow).toBe(false);
  });
});

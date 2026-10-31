import { describe, expect, it } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import type { Points, ShaderMaterial } from "three";
import { Steam } from "@/components/scene/Steam";
import { BREAK_SCENE } from "@/lib/scene/constants";
import { STILL_STEAM_SECONDS, createSteamMaterial, steamSeeds } from "@/lib/scene/steam";

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
const steam = (renderer: Renderer) =>
  renderer.scene.findByProps({ name: "steam" }).instance as Points;
const time = (renderer: Renderer) =>
  (steam(renderer).material as ShaderMaterial).uniforms.uTime.value;
const frames = (renderer: Renderer, count: number, delta = 0.1) =>
  ReactThreeTestRenderer.act(async () => {
    await renderer.advanceFrames(count, delta);
  });

describe("the steam", () => {
  it("spreads its puffs through their cycle, so there is always some at every height", () => {
    const seeds = Array.from(steamSeeds(BREAK_SCENE.steam.count)).map(
      (seed) => ((seed % 1) + 1) % 1,
    );
    const sorted = [...seeds].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i += 1) expect(sorted[i] - sorted[i - 1]).toBeLessThan(0.05);
    expect(new Set(seeds).size).toBe(seeds.length);
  });

  it("rises in a circle: the shader turns each puff round the mug's axis as it climbs", () => {
    const material = createSteamMaterial();
    expect(material.vertexShader).toMatch(/cos\(angle\)/);
    expect(material.vertexShader).toMatch(/sin\(angle\)/);
    expect(material.vertexShader).toMatch(/life \* uHeight/);
    expect(material.uniforms.uTurns.value).toBeGreaterThan(1);
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    material.dispose();
  });

  it("draws one point per puff", async () => {
    const renderer = await ReactThreeTestRenderer.create(<Steam reduced={false} />);
    expect(steam(renderer).geometry.getAttribute("aSeed").count).toBe(BREAK_SCENE.steam.count);
    await renderer.unmount();
  });

  it("moves with time", async () => {
    const renderer = await ReactThreeTestRenderer.create(<Steam reduced={false} />);
    await frames(renderer, 3);
    const first = time(renderer);
    await frames(renderer, 5);
    expect(time(renderer)).toBeGreaterThan(first);
    await renderer.unmount();
  });

  it("stands still under reduced motion, as a plume caught part way up", async () => {
    const renderer = await ReactThreeTestRenderer.create(<Steam reduced />);
    await frames(renderer, 6);
    expect(time(renderer)).toBe(STILL_STEAM_SECONDS);
    await renderer.unmount();
  });

  it("sizes its puffs in world units, whatever the zoom", async () => {
    const renderer = await ReactThreeTestRenderer.create(<Steam reduced={false} />);
    await frames(renderer, 2);
    const material = steam(renderer).material as ShaderMaterial;
    expect(material.uniforms.uPixelsPerUnit.value).toBeGreaterThan(0);
    await renderer.unmount();
  });
});

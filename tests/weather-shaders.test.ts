import { describe, expect, it } from "vitest";
import { AdditiveBlending, NormalBlending } from "three";
import { createWeatherMaterial } from "@/lib/scene/weatherShaders";
import type { ParticleKind } from "@/lib/scene/seasons";

const KINDS: ParticleKind[] = ["snow", "petals", "leaves", "motes"];

describe("the weather's shaders", () => {
  it.each(KINDS)(
    "draw %s as transparent sprites that never write depth, so they sit over the scene",
    (kind) => {
      const material = createWeatherMaterial(kind);
      expect(material.transparent).toBe(true);
      expect(material.depthWrite).toBe(false);
      expect(material.toneMapped).toBe(false);
      material.dispose();
    },
  );

  it("add light together only for sunlit motes", () => {
    expect(createWeatherMaterial("motes").blending).toBe(AdditiveBlending);
    for (const kind of ["snow", "petals", "leaves"] as const)
      expect(createWeatherMaterial(kind).blending).toBe(NormalBlending);
  });

  it.each(KINDS)(
    "take everything that moves from attributes, so the shader holds no motion of its own, for %s",
    (kind) => {
      const { vertexShader } = createWeatherMaterial(kind);
      for (const name of ["aColor", "aAlpha", "aRotation", "aSize"])
        expect(vertexShader).toContain(name);
      // The position is the particle's own: nothing in the vertex shader moves it.
      expect(vertexShader).toMatch(/modelViewMatrix \* vec4\(position, 1\.0\)/);
      expect(vertexShader).not.toMatch(/uTime/);
    },
  );

  it.each(KINDS)("convert their colours for the screen, for %s", (kind) => {
    expect(createWeatherMaterial(kind).fragmentShader).toContain("#include <colorspace_fragment>");
  });

  it("gives every kind a look of its own, not the same dot", () => {
    const sources = new Set(KINDS.map((kind) => createWeatherMaterial(kind).fragmentShader));
    expect(sources.size).toBe(KINDS.length);
  });

  it("draws a petal as a teardrop that turns and flips, with edge-on petals kept as slivers", () => {
    const { fragmentShader } = createWeatherMaterial("petals");
    expect(fragmentShader).toMatch(/turn\(/);
    expect(fragmentShader).toMatch(/vRotation\.y/);
    expect(fragmentShader).toMatch(/max\(abs\(vRotation\.y\), 0\.\d+\)/);
  });

  it("draws a leaf with a stalk, a midrib and veins, and a serrated edge", () => {
    const { fragmentShader } = createWeatherMaterial("leaves");
    for (const part of ["stalk", "midrib", "veins", "serration"])
      expect(fragmentShader).toContain(part);
  });

  it("makes motes twinkle in their own time, from the clock and their own phase", () => {
    const { fragmentShader } = createWeatherMaterial("motes");
    expect(fragmentShader).toMatch(/twinkle/);
    expect(fragmentShader).toMatch(/uTime/);
    expect(fragmentShader).toMatch(/vRotation\.x/);
  });

  it("draws flakes crisp with faint arms when small, and soft and faint when big, for some depth", () => {
    const { fragmentShader } = createWeatherMaterial("snow");
    for (const part of ["crisp", "arms", "soft", "blur", "halo", "vPixels"])
      expect(fragmentShader).toContain(part);
  });

  it("draws sprites big enough to hold what is drawn in them, more so for the glowing and the tumbling", () => {
    const scale = (kind: ParticleKind) =>
      createWeatherMaterial(kind).uniforms.uSpriteScale.value as number;
    for (const kind of KINDS) expect(scale(kind)).toBeGreaterThan(1.4);
    expect(scale("motes")).toBeGreaterThan(scale("snow"));
    expect(scale("leaves")).toBeGreaterThan(scale("snow"));
  });
});

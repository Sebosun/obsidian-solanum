import { describe, expect, it } from "vitest";
import { BoxGeometry, Mesh, MeshStandardMaterial } from "three";
import { GrowthTransition } from "../src/lib/scene/GrowthTransition";
import { clonePlantMaterials } from "../src/lib/crops/materials";

describe("crop growth transitions", () => {
  it("crossfades grounded stages and settles to a single mature model", () => {
    const growth = new GrowthTransition(1);
    growth.retarget(2, 10);
    const layers = growth.sample(10.3);
    expect(layers).toHaveLength(2);
    expect(layers.reduce((sum, layer) => sum + layer.opacity, 0)).toBeCloseTo(1);
    expect(layers.every((layer) => layer.scale > 0.9 && layer.scale <= 1)).toBe(true);
    expect(growth.sample(11)).toEqual([{ stage: 2, opacity: 1, scale: 1 }]);
  });

  it("bounds rapid stage changes and skips animation for reduced motion", () => {
    const growth = new GrowthTransition(0);
    growth.retarget(1, 0);
    growth.retarget(3, 0.2);
    growth.retarget(4, 0.3);
    expect(growth.sample(0.4)).toHaveLength(2);
    expect(growth.sample(2)[0].stage).toBe(4);
    growth.retarget(2, 3, true);
    expect(growth.sample(3)).toEqual([{ stage: 2, opacity: 1, scale: 1 }]);
  });

  it("never fades or disposes another calendar plant's shared material", () => {
    const material = new MeshStandardMaterial();
    const original = new Mesh(new BoxGeometry(), material);
    const clone = original.clone();
    const privateMaterials = clonePlantMaterials(clone);
    privateMaterials[0].opacity = 0.2;
    privateMaterials[0].dispose();
    expect(material.opacity).toBe(1);
    expect(clone.material).not.toBe(original.material);
  });
});

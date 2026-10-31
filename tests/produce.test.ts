import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Box3, Vector3 } from "three";
import { CropAssets } from "@/lib/crops/CropAssets";
import { CROPS, produceModel, type CropId } from "@/lib/crops/catalog";
import { prepareProduce } from "@/lib/crops/geometry";

const reader = async (filename: string) => {
  const bytes = readFileSync(`assets/${filename}`);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
};

describe("produce rather than the plant", () => {
  it("is something only crops whose plant is not the harvest have", () => {
    expect(produceModel("coconut")).toBe("Coconut_produce");
    for (const crop of ["carrot", "pumpkin"] as CropId[]) expect(produceModel(crop)).toBeNull();
  });

  it("names a model file that ships, for every crop that has one", () => {
    for (const crop of Object.keys(CROPS) as CropId[]) {
      const model = produceModel(crop);
      if (model !== null) expect(() => readFileSync(`assets/crops/${model}.glb`)).not.toThrow();
    }
  });

  it("loads the produce model once and shares it, and refuses crops without one", async () => {
    const assets = new CropAssets(reader);
    const first = assets.loadProduce("coconut");
    expect(assets.loadProduce("coconut")).toBe(first);
    expect((await first).scene.children.length).toBeGreaterThan(0);
    await expect(assets.loadProduce("carrot")).rejects.toThrow(/no produce model/);
  });

  it("is sized and grounded on its own, since it has no growth stages to compare with", async () => {
    const assets = new CropAssets(reader);
    const { scene } = await assets.loadProduce("coconut");
    const { object, factor } = prepareProduce(scene);
    const box = new Box3().setFromObject(object);
    const size = box.getSize(new Vector3());
    expect(Math.max(size.x, size.y, size.z) * factor).toBeCloseTo(1.3, 6);
    expect(box.min.y).toBeCloseTo(0, 6);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 6);
  });
});

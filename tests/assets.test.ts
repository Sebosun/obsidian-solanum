import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cropStage } from "@/lib/crops/growth";
import { CROPS } from "@/lib/crops/catalog";
import { Box3, Group, Vector3 } from "three";
import { preparePlant } from "@/lib/crops/geometry";
import { loadAsset } from "./helpers/glb";

describe("offline crop assets", () => {
  it.each(Object.values(CROPS))(
    "loads and consistently grounds $name growth models with Three.js",
    async (crop) => {
      const load = (stage: number) => loadAsset(`crops/${crop.model}_${stage}.glb`);
      const [young, mature] = await Promise.all([load(1), load(4)]);
      const original = mature.scene.position.clone();
      const normalized = preparePlant(mature.scene, mature.scene);
      const group = new Group();
      group.scale.setScalar(normalized.factor);
      group.add(normalized.object);
      const bounds = new Box3().setFromObject(group);
      const size = bounds.getSize(new Vector3());
      expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(1.8);
      expect(bounds.min.y).toBeCloseTo(0);
      expect(bounds.getCenter(new Vector3()).x).toBeCloseTo(0);
      expect(mature.scene.position).toEqual(original);
      expect(preparePlant(young.scene, mature.scene).factor).toBe(normalized.factor);
      expect(new Box3().setFromObject(young.scene).getSize(new Vector3()).y).toBeLessThan(
        new Box3().setFromObject(mature.scene).getSize(new Vector3()).y,
      );
    },
  );

  it.each(
    Object.values(CROPS).flatMap((crop) => [1, 2, 3, 4].map((stage) => `${crop.model}_${stage}`)),
  )("ships valid self-contained growth model %s", (model) => {
    const buffer = readFileSync(`assets/crops/${model}.glb`);
    expect(buffer.subarray(0, 4).toString()).toBe("glTF");
    expect(buffer.readUInt32LE(4)).toBe(2);
    expect(buffer.readUInt32LE(8)).toBe(buffer.length);
    const gltf = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString());
    expect(gltf.meshes.length).toBeGreaterThan(0);
    expect(gltf.buffers.every((b: { uri?: string }) => !b.uri)).toBe(true);
    expect((gltf.images ?? []).every((i: { uri?: string }) => !i.uri)).toBe(true);
  });

  it("maps real focused progress to seed, sprout, growth, and maturity", () => {
    expect([0, 0.2, 0.4, 0.7, 1].map(cropStage)).toEqual([0, 1, 2, 3, 4]);
    expect(cropStage(-1)).toBe(0);
    expect(cropStage(5)).toBe(4);
  });
});

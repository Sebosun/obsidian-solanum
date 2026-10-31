import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cropStage } from "../src/lib/crops/growth";
import { CROPS } from "../src/lib/crops/catalog";

describe("offline crop assets", () => {
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

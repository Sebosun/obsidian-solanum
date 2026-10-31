import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cropStage } from "../src/crops";

describe("offline crop assets", () => {
  it.each([1, 2, 3, 4])("ships valid self-contained tomato growth stage %i", (stage) => {
    const buffer = readFileSync(`assets/crops/Tomato_${stage}.glb`);
    expect(buffer.subarray(0, 4).toString()).toBe("glTF");
    expect(buffer.readUInt32LE(4)).toBe(2);
    expect(buffer.readUInt32LE(8)).toBe(buffer.length);
    const gltf = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString());
    expect(gltf.meshes.length).toBeGreaterThan(0);
    expect(gltf.buffers.every((b: { uri?: string }) => !b.uri)).toBe(true);
    expect((gltf.images ?? []).every((i: { uri?: string }) => !i.uri)).toBe(true);
  });

  it("maps real focused progress to seed, sprout, growth, and maturity", () => {
    expect([0, .2, .4, .7, 1].map(cropStage)).toEqual([0, 1, 2, 3, 4]);
    expect(cropStage(-1)).toBe(0);
    expect(cropStage(5)).toBe(4);
  });
});

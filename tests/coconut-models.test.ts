import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Box3, Mesh, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CROPS } from "@/lib/crops/catalog";

const load = async (stage: number | "produce") => {
  const bytes = readFileSync(`assets/crops/Coconut_${stage}.glb`);
  return new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
};

describe("the coconut", () => {
  it("is a crop with its own emoji, four growth models and a model of its produce", () => {
    expect(CROPS.coconut).toEqual({
      name: "Coconut",
      model: "Coconut",
      emoji: "🥥",
      produce: "Coconut_produce",
    });
  });

  it("grows: each stage is taller than the one before, and only the last is a full palm", async () => {
    const heights: number[] = [];
    for (const stage of [1, 2, 3, 4]) {
      const { scene } = await load(stage);
      heights.push(new Box3().setFromObject(scene).getSize(new Vector3()).y);
    }
    expect([...heights].sort((a, b) => a - b)).toEqual(heights);
    expect(heights[0]).toBeLessThan(heights[3] / 2);
  });

  it("stays low poly, in a single coloured mesh, at every stage", async () => {
    for (const stage of [1, 2, 3, 4]) {
      const { scene } = await load(stage);
      const meshes: Mesh[] = [];
      scene.traverse((node) => node instanceof Mesh && meshes.push(node));
      expect(meshes).toHaveLength(1);
      const triangles = meshes[0].geometry.getAttribute("position").count / 3;
      expect(triangles).toBeLessThan(2500);
      expect(meshes[0].geometry.getAttribute("color")).toBeDefined();
    }
  });

  it("has produce, a low poly pile of nuts, much smaller than the palm", async () => {
    const produce = await load("produce");
    const palm = await load(4);
    const size = (scene: Awaited<ReturnType<typeof load>>["scene"]) =>
      new Box3().setFromObject(scene).getSize(new Vector3());
    expect(size(produce.scene).y).toBeLessThan(size(palm.scene).y / 2);
    let triangles = 0;
    produce.scene.traverse((node) => {
      if (node instanceof Mesh) triangles += node.geometry.getAttribute("position").count / 3;
    });
    expect(triangles).toBeGreaterThan(100);
    expect(triangles).toBeLessThan(1500);
  });

  it("is rebuilt identically by the script that made it, so the files are reproducible", () => {
    const directory = mkdtempSync(join(tmpdir(), "solanum-coconut-"));
    try {
      execFileSync(process.execPath, ["scripts/build-coconut-models.mjs", directory], {
        stdio: "ignore",
      });
      for (const stage of [1, 2, 3, 4, "produce"]) {
        const rebuilt = readFileSync(join(directory, `Coconut_${stage}.glb`));
        expect(rebuilt.equals(readFileSync(`assets/crops/Coconut_${stage}.glb`))).toBe(true);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

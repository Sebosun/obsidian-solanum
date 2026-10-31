import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Box3, Mesh, Vector3 } from "three";
import { BREAK_SCENE } from "@/lib/scene/constants";
import { CAT_FILE, loadCat } from "./helpers/catModel";

/** The runtime has this on every keyframe track; the typings leave it out. */
interface Interpolating {
  createInterpolant(): { evaluate(time: number): ArrayLike<number> };
}

describe("the shipped sleeping cat", () => {
  it("is a self-contained GLB that stays small", () => {
    const buffer = readFileSync(CAT_FILE);
    expect(buffer.subarray(0, 4).toString()).toBe("glTF");
    expect(buffer.readUInt32LE(8)).toBe(buffer.length);
    const gltf = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString());
    expect(gltf.buffers.every((b: { uri?: string }) => !b.uri)).toBe(true);
    expect((gltf.images ?? []).every((i: { uri?: string }) => !i.uri)).toBe(true);
    expect(statSync(CAT_FILE).size).toBeLessThan(400_000);
    expect(BREAK_SCENE.catModel).toBe("Cat_sleeping.glb");
  });

  it("lies on the ground, about a unit long, facing +X", async () => {
    const { scene } = await loadCat();
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    expect(box.min.y).toBeGreaterThanOrEqual(-0.01);
    expect(box.min.y).toBeLessThan(0.03);
    expect(size.x).toBeGreaterThan(0.8);
    expect(size.x).toBeLessThan(1.3);
    expect(size.y).toBeLessThan(size.x / 2);
    // The head is at the +X end.
    const head = new Box3().setFromObject(scene.getObjectByName("Head")!);
    expect(head.getCenter(new Vector3()).x).toBeGreaterThan(box.getCenter(new Vector3()).x);
  });

  it("is the parts the scene animates, painted in vertex colours with one plain material", async () => {
    const { scene } = await loadCat();
    for (const name of ["Cat", "Body", "Head", "EarL", "EarR", "EyeL", "EyeR", "Nose"])
      expect(scene.getObjectByName(name), name).toBeDefined();
    const materials = new Set<unknown>();
    let triangles = 0;
    scene.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      materials.add(node.material);
      expect(node.geometry.getAttribute("color"), node.name).toBeDefined();
      triangles += (node.geometry.index?.count ?? node.geometry.getAttribute("position").count) / 3;
    });
    expect(materials.size).toBe(1);
    expect(triangles).toBeGreaterThan(1000);
    expect(triangles).toBeLessThan(12_000);
  });

  it("carries one looping Sleep animation that breathes, flicks the ears and stirs the tail", async () => {
    const { animations } = await loadCat();
    expect(animations.map((clip) => clip.name)).toEqual(["Sleep"]);
    const [clip] = animations;
    expect(clip.duration).toBeGreaterThan(3);
    const driven = new Set(clip.tracks.map((track) => track.name.split(".")[0]));
    for (const part of ["Body", "Head", "EarL", "EarR", "Tail1"])
      expect(driven.has(part), part).toBe(true);
    const breath = clip.tracks.find((track) => track.name === "Body.scale")!;
    const heights = breath.values.filter((_, i) => i % 9 === 4 || i % 9 === 1 || i % 9 === 7);
    expect(Math.max(...heights)).toBeGreaterThan(1.02);
    // Every part ends where it began, so the loop has no jump.
    for (const track of clip.tracks) {
      const interpolant = (track as unknown as Interpolating).createInterpolant();
      const start = Array.from(interpolant.evaluate(0));
      const end = Array.from(interpolant.evaluate(clip.duration));
      start.forEach((value, i) => expect(end[i], `${track.name}[${i}]`).toBeCloseTo(value, 3));
    }
  });
});

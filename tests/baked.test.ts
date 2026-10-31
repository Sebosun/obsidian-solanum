import { statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Box3, Mesh, MeshBasicMaterial, SRGBColorSpace, Vector3, type Object3D } from "three";
import { floorAtCentre, prepareBaked } from "@/lib/models/baked";
import { MUG_FILE, PILLOW_FILE, loadMug, loadPillow } from "./helpers/catModel";

const meshesOf = (root: Object3D) => {
  const found: Mesh[] = [];
  root.traverse((node) => node instanceof Mesh && found.push(node));
  return found;
};

describe.each([
  ["mug", MUG_FILE, loadMug],
  ["pillow", PILLOW_FILE, loadPillow],
])("the shipped %s, baked with its own light", (_name, file, load) => {
  it("stays a reasonable size to ship", () => {
    expect(statSync(file).size).toBeLessThan(3_000_000);
  });

  it("is unlit, with its colours in an sRGB texture and no tint from vertex colours", async () => {
    const { scene } = await load();
    const meshes = meshesOf(scene);
    expect(meshes).toHaveLength(1);
    const [mesh] = meshes;
    expect(mesh.material).toBeInstanceOf(MeshBasicMaterial);
    const material = mesh.material as MeshBasicMaterial;
    expect(material.map).not.toBeNull();
    // The texture holds colours as seen on screen; reading them any other way would shift them.
    expect(material.map?.colorSpace).toBe(SRGBColorSpace);
    // Vertex colours multiply the texture, so they must be plain white or they would dim it.
    const color = mesh.geometry.getAttribute("color");
    for (let i = 0; i < color.count; i += 1)
      expect([color.getX(i), color.getY(i), color.getZ(i)]).toEqual([1, 1, 1]);
  });
});

describe("preparing a baked model for the scene", () => {
  it("keeps its colours out of the renderer's tone mapping, which would shift and wash them out", async () => {
    const { scene } = await loadPillow();
    const { materials } = prepareBaked(scene, { size: { width: 1.9 } });
    expect(materials.length).toBeGreaterThan(0);
    for (const material of materials) expect(material.toneMapped).toBe(false);
  });

  it("gives its copy private materials, leaving the shared model untouched", async () => {
    const { scene } = await loadMug();
    const { materials } = prepareBaked(scene, { size: { height: 0.24 } });
    const [original] = meshesOf(scene).map((mesh) => mesh.material as MeshBasicMaterial);
    expect(materials[0]).not.toBe(original);
    materials[0].color.setScalar(0.1);
    expect(original.color.r).toBe(1);
    expect(original.toneMapped).toBe(true);
  });

  it("sizes it by height and stands it on the ground, keeping its own axis", async () => {
    const { scene } = await loadMug();
    const { object, factor } = prepareBaked(scene, { size: { height: 0.24 } });
    const box = new Box3().setFromObject(object);
    expect(box.min.y).toBeCloseTo(0, 6);
    expect(box.getSize(new Vector3()).y * factor).toBeCloseTo(0.24, 6);
    expect(box.min.x).toBeLessThan(0);
    expect(box.max.x).toBeGreaterThan(0);
  });

  it("sizes it by width and centres it over the origin when asked", async () => {
    const { scene } = await loadPillow();
    const { object, factor } = prepareBaked(scene, { size: { width: 1.9 }, centered: true });
    const box = new Box3().setFromObject(object);
    expect(box.getSize(new Vector3()).x * factor).toBeCloseTo(1.9, 6);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 6);
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(0, 6);
    expect(box.min.y).toBeCloseTo(0, 6);
  });

  it("finds the floor of a dish at its centre, below the rim", async () => {
    const { scene } = await loadPillow();
    const { object } = prepareBaked(scene, { size: { width: 1.9 }, centered: true });
    const floor = floorAtCentre(object);
    const top = new Box3().setFromObject(object).max.y;
    expect(floor).toBeGreaterThan(0.1);
    expect(floor).toBeLessThan(top * 0.8);
  });

  it("says the floor is the ground when there is nothing to land on", () => {
    expect(floorAtCentre(new Mesh())).toBe(0);
  });
});

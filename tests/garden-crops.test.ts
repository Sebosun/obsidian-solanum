import { describe, expect, it } from "vitest";
import { Box3, Group, Mesh, MeshBasicMaterial, Vector3 } from "three";
import { CROPS, isCropId, produceModel } from "@/lib/crops/catalog";
import { CropAssets } from "@/lib/crops/CropAssets";
import { preparePlant, prepareProduce } from "@/lib/crops/geometry";
import { clonePlantMaterials } from "@/lib/crops/materials";
import { VaultSessionStore } from "@/lib/storage/VaultSessionStore";
import { TimerService } from "@/lib/timer/TimerService";
import { assetReader, loadAsset } from "./helpers/glb";
import { MemoryDisk } from "./helpers/memoryDisk";

const families = ["tomato", "corn", "apple"] as const;
const load = (name: string) => loadAsset(`crops/garden/${name}.glb`);
const size = (object: Group) => new Box3().setFromObject(object).getSize(new Vector3());

describe("the Blender-grown crops and their picked produce", () => {
  it("registers apple and directs all three families to their Blender models and produce", () => {
    expect(isCropId("apple")).toBe(true);
    for (const family of families) {
      const name = family[0].toUpperCase() + family.slice(1);
      expect(CROPS[family].model).toBe(`garden/${name}`);
      expect(produceModel(family)).toBe(`garden/${name}_produce`);
    }
  });

  it.each(families)(
    "%s builds up through four grounded stages, and its harvest is a separate smaller object",
    async (family) => {
      const name = family[0].toUpperCase() + family.slice(1);
      const stages = await Promise.all([1, 2, 3, 4].map((stage) => load(`${name}_${stage}`)));
      const heights = stages.map((stage) => size(stage.scene).y);
      for (let i = 1; i < heights.length; i += 1)
        expect(heights[i]).toBeGreaterThan(heights[i - 1]);
      const harvest = await load(`${name}_produce`);
      expect(size(harvest.scene).y).toBeLessThan(heights[3] * 0.8);
      for (const model of [...stages, harvest]) {
        const meshes: Mesh[] = [];
        model.scene.traverse((node) => {
          if (node instanceof Mesh) meshes.push(node);
        });
        expect(meshes).toHaveLength(1);
        expect(meshes[0].material).toBeInstanceOf(MeshBasicMaterial);
        expect(meshes[0].geometry.getAttribute("color")).toBeDefined();
        expect(meshes[0].geometry.getAttribute("position").count / 3).toBeLessThan(2500);
        expect(model.cameras).toHaveLength(0);
        expect(new Box3().setFromObject(model.scene).min.y).toBeCloseTo(0, 5);
      }
      const prepared = preparePlant(stages[0].scene, stages[3].scene);
      expect(prepared.factor).toBe(preparePlant(stages[3].scene, stages[3].scene).factor);
    },
  );

  it.each(families)(
    "%s loads its picked produce through the same offline cache and sizes it independently",
    async (family) => {
      const assets = new CropAssets(assetReader);
      const first = assets.loadProduce(family);
      expect(assets.loadProduce(family)).toBe(first);
      const { scene } = await first;
      const prepared = prepareProduce(scene);
      const group = new Group();
      group.scale.setScalar(prepared.factor);
      group.add(prepared.object);
      const bounds = new Box3().setFromObject(group);
      expect(Math.max(...bounds.getSize(new Vector3()).toArray())).toBeCloseTo(1.3, 5);
      expect(bounds.min.y).toBeCloseTo(0, 5);
    },
  );

  it("keeps baked colours out of tone mapping and clones materials before growth animation", async () => {
    const { scene } = await load("Tomato_4");
    const object = scene.clone(true);
    const original = scene.getObjectByProperty("type", "Mesh");
    if (!(original instanceof Mesh) || !(original.material instanceof MeshBasicMaterial))
      throw new Error("Invalid baked asset");
    const materials = clonePlantMaterials(object);
    expect(materials[0]).not.toBe(original.material);
    expect(materials[0].toneMapped).toBe(false);
    materials[0].opacity = 0.2;
    expect(original.material.opacity).toBe(1);
  });

  it("persists and restores apple sessions through the normal validated session store", async () => {
    let now = new Date(2026, 9, 31, 12).getTime();
    let serial = 0;
    const disk = new MemoryDisk();
    const store = new VaultSessionStore(disk);
    const environment = { now: () => now, id: () => `apple-session-${++serial}` };
    const timer = new TimerService(store, environment);
    const id = await timer.start({
      crop: "apple",
      durationMs: 25 * 60_000,
      breakMs: 5 * 60_000,
      autoBreak: false,
      tags: [],
      notePath: null,
    });
    now += 60_000;
    await timer.pause(id);
    const restored = new TimerService(new VaultSessionStore(disk), environment);
    await restored.refresh();
    expect(restored.getState().sessions[0]).toMatchObject({ crop: "apple", status: "paused" });
  });
});

import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { Mesh, MeshBasicMaterial } from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { Plant } from "@/components/models/Plant";

const models = vi.hoisted(() => ({
  plants: new Map<string, GLTF>(),
  produce: new Map<string, GLTF>(),
}));
vi.mock("@/hooks/useCropModel", () => ({
  useCropModel: (crop: string) => models.plants.get(crop),
}));
vi.mock("@/hooks/useProduceModel", () => ({
  useProduceModel: (crop: string) => models.produce.get(crop),
}));
const families = ["tomato", "corn", "apple"] as const;

beforeAll(async () => {
  const loader = new GLTFLoader();
  for (const family of families) {
    const name = family[0].toUpperCase() + family.slice(1);
    for (const [suffix, store] of [
      ["4", models.plants],
      ["produce", models.produce],
    ] as const) {
      const bytes = readFileSync(`assets/crops/garden/${name}_${suffix}.glb`);
      store.set(
        family,
        await loader.parseAsync(
          bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
          "",
        ),
      );
    }
  }
});

describe("the mature plant is not its harvest", () => {
  it.each(families)(
    "%s keeps stage 4 as a plant but renders only picked produce in harvest views",
    async (crop) => {
      for (const harvested of [false, true]) {
        const model = (harvested ? models.produce : models.plants).get(crop);
        const source = model?.scene.getObjectByProperty("type", "Mesh");
        if (!(source instanceof Mesh)) throw new Error("Missing source crop");
        const sourceDispose = vi.spyOn(source.geometry, "dispose");
        const renderer = await ReactThreeTestRenderer.create(
          <Plant crop={crop} stage={4} harvested={harvested} />,
        );
        const mesh = renderer.scene.instance.getObjectByProperty("type", "Mesh");
        if (!(mesh instanceof Mesh) || !(mesh.material instanceof MeshBasicMaterial))
          throw new Error("Missing baked crop");
        expect(mesh.geometry).toBe(source.geometry);
        expect(mesh.material.toneMapped).toBe(false);
        expect(mesh.material).not.toBe(source.material);
        expect(mesh.name.includes("produce")).toBe(harvested);
        const ownedDispose = vi.spyOn(mesh.material, "dispose");
        await renderer.unmount();
        expect(ownedDispose).toHaveBeenCalledOnce();
        expect(sourceDispose).not.toHaveBeenCalled();
      }
    },
  );
});

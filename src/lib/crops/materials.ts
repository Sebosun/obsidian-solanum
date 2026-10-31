import { Mesh, MeshBasicMaterial, type Material, type Object3D } from "three";

interface PlantMaterialOptions {
  animated?: boolean;
}

/** GLTF caches share materials. Only animated instances may mutate these private clones. */
export function clonePlantMaterials(
  object: Object3D,
  { animated = true }: PlantMaterialOptions = {},
): Material[] {
  const clones = new Map<Material, Material>();
  function cloneMaterial(original: Material): Material {
    let clone = clones.get(original);
    if (!clone) {
      clone = original.clone();
      clone.transparent = original.transparent || animated;
      if (clone instanceof MeshBasicMaterial) clone.toneMapped = false;
      clones.set(original, clone);
    }
    return clone;
  }
  object.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    if (Array.isArray(child.material)) child.material = child.material.map(cloneMaterial);
    else child.material = cloneMaterial(child.material);
  });
  return [...clones.values()];
}

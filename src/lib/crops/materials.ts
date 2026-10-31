import { Mesh, type Material, type Object3D } from "three";

/** GLTF caches share materials. Only animated instances may mutate these private clones. */
export function clonePlantMaterials(object: Object3D): Material[] {
  const clones = new Map<Material, Material>();
  function cloneMaterial(original: Material): Material {
    let clone = clones.get(original);
    if (!clone) {
      clone = original.clone();
      clone.transparent = true;
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

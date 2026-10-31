import { Box3, Mesh, MeshBasicMaterial, Vector3, type Material, type Object3D } from "three";

export interface PreparedMug {
  object: Object3D;
  /** Scale that makes the mug as tall as wanted. */
  factor: number;
  /** The mug's own materials, private to this copy so its brightness can change. */
  materials: MeshBasicMaterial[];
}

/** The mug sits on the ground at its own axis, scaled to the height the scene wants. */
export function prepareMug(scene: Object3D, height: number): PreparedMug {
  const object = scene.clone(true);
  const box = new Box3().setFromObject(object);
  object.position.set(0, -box.min.y, 0);
  const copies = new Map<Material, MeshBasicMaterial>();
  object.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const original = node.material as Material;
    if (!(original instanceof MeshBasicMaterial)) return;
    let copy = copies.get(original);
    if (!copy) {
      copy = original.clone();
      copies.set(original, copy);
    }
    node.material = copy;
  });
  return {
    object,
    factor: height / Math.max(box.getSize(new Vector3()).y, 0.001),
    materials: [...copies.values()],
  };
}
